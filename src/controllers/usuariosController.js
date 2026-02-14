const usuariosRepository = require("../repositories/usuariosRepository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.json");
const { Op } = require("sequelize");

function UsuarioController() {
  async function cadastrar(req, res) {
    try {
      const { nome, telefone, email, senha, role, foto_perfil, cliente_endereco, empresa_pai_id } = req.body;

      if (!nome || !telefone || !email || !senha || !role) {
        return res.status(400).json({ 
          error: "Nome, telefone, email, senha e role são obrigatórios" 
        });
      }

      if (!["cliente", "empresa", "admin", "empresa-funcionario"].includes(role)) {
        return res.status(400).json({ 
          error: "Role inválido. Use 'cliente', 'empresa', 'admin' ou 'empresa-funcionario'." 
        });
      }

      const usuarioExistente = await usuariosRepository.buscarUsuarioPorEmail(email);
      if (usuarioExistente) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }

      const telefoneLimpo = telefone.replace(/\D/g, '');
      if (!/^\d{10,11}$/.test(telefoneLimpo)) {
        return res.status(400).json({ 
          error: "Telefone inválido. Use apenas números (10 ou 11 dígitos)." 
        });
      }

      if (foto_perfil) {
        if (!foto_perfil.startsWith('data:image')) {
          return res.status(400).json({ 
            error: "Formato inválido para a foto de perfil (deve ser base64 'data:image/...')" 
          });
        }
        if (foto_perfil.length > 5000000) {
          return res.status(400).json({ error: "Foto muito grande (máx 5MB)" });
        }
      }

      let empresaPaiIdFinal = empresa_pai_id || null;
      if (req.user && req.user.role === 'empresa') {
        if (role === 'empresa-funcionario' || role === 'cliente' || role === 'empresa') {
          empresaPaiIdFinal = req.user.usuario_id;
        }
      }

      const usuarioCriado = await usuariosRepository.criarUsuario({
        usuario: {
          nome,
          telefone: telefoneLimpo,
          email,
          senha,
          role,
          cliente_endereco: cliente_endereco || null,
          empresa_pai_id: empresaPaiIdFinal
        },
        fotoPerfilBase64: foto_perfil
      });

      const usuarioRetorno = usuarioCriado.toJSON();
      delete usuarioRetorno.senha;

      res.status(201).json({
        message: "Usuário cadastrado com sucesso",
        usuario: usuarioRetorno
      });
    } catch (error) {
      console.error("Erro no cadastro:", error);
      res.status(500).json({
        error: "Erro ao cadastrar usuário",
        details: error.message
      });
    }
  }

  async function logar(req, res) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      const usuario = await usuariosRepository.buscarUsuarioPorEmail(email);
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: "Senha incorreta" });
      }

      const token = jwt.sign(
        {
          usuario_id: usuario.usuario_id,
          role: usuario.role,
          email: usuario.email
        },
        authConfig.secret,
        { expiresIn: "24h" }
      );

      const resposta = {
        usuario: {
          usuario_id: usuario.usuario_id,
          email: usuario.email,
          role: usuario.role,
          nome: usuario.nome,
          telefone: usuario.telefone,
          foto_perfil: usuario.foto_perfil,
          empresa_pai_id: usuario.empresa_pai_id || null
        },
        token
      };

      res.json(resposta);
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ error: "Erro no login" });
    }
  }

  async function listar(req, res) {
    try {
      const { role: userRole } = req.user;
      let whereClause = {
        usuario_id: { [Op.ne]: req.user.usuario_id }
      };

      switch (userRole) {
        case 'admin':
          console.log('🔑 Admin logado - mostrando todos os usuários');
          break;
          
        case 'empresa':
          whereClause[Op.or] = [
            { role: 'empresa-funcionario', empresa_pai_id: req.user.usuario_id },
            { role: 'empresa', empresa_pai_id: req.user.usuario_id },
            { role: 'cliente' }
          ];
          console.log('🏢 Empresa logada - mostrando funcionários, empresas filhas e clientes');
          break;
          
        case 'empresa-funcionario':
          const funcionario = await usuariosRepository.buscarUsuarioPorId(req.user.usuario_id);
          if (funcionario && funcionario.empresa_pai_id) {
            whereClause[Op.or] = [
              { role: 'empresa-funcionario', empresa_pai_id: funcionario.empresa_pai_id },
              { role: 'empresa', empresa_pai_id: funcionario.empresa_pai_id },
              { role: 'cliente' }
            ];
            console.log('👔 Funcionário logado - mostrando funcionários, empresas filhas e clientes da empresa pai');
          } else {
            whereClause.usuario_id = { [Op.eq]: -1 };
          }
          break;
          
        case 'cliente':
          whereClause.role = 'empresa';
          console.log('👤 Cliente logado - mostrando apenas empresas');
          break;
          
        default:
          return res.status(403).json({ error: 'Role não autorizado' });
      }

      const usuarios = await usuariosRepository.listarUsuarios(whereClause);

      if (usuarios.length === 0) {
        const roleMessage = userRole === 'admin' ? 'usuários' : 
                           userRole === 'empresa' ? 'empresas e clientes' : 'empresas';
        
        return res.json({
          message: `Nenhum ${roleMessage} encontrado.`,
          usuarios: []
        });
      }

      res.json(
        usuarios.map((u) => {
          const usuario = u.toJSON();
          delete usuario.senha;
          return {
            usuario_id: usuario.usuario_id,
            nome: usuario.nome,
            telefone: usuario.telefone,
            email: usuario.email,
            role: usuario.role,
            foto_perfil: usuario.foto_perfil,
            cliente_endereco: usuario.cliente_endereco,
            empresa_pai_id: usuario.empresa_pai_id
          };
        })
      );
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      res.status(500).json({ error: "Erro ao listar usuários" });
    }
  }

  async function buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const usuario = await usuariosRepository.buscarUsuarioPorId(id);

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const usuarioRetorno = usuario.toJSON();
      delete usuarioRetorno.senha;

      res.json(usuarioRetorno);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  }

  async function atualizar(req, res) {
    try {
      const { id } = req.params;
      const dadosAtualizacao = req.body;

      delete dadosAtualizacao.senha;
      delete dadosAtualizacao.usuario_id;
      delete dadosAtualizacao.role;
      delete dadosAtualizacao.foto_perfil;

      if (dadosAtualizacao.telefone) {
        const telefoneLimpo = dadosAtualizacao.telefone.replace(/\D/g, '');
        if (!/^\d{10,11}$/.test(telefoneLimpo)) {
          return res.status(400).json({ 
            error: "Telefone inválido. Use apenas números (10 ou 11 dígitos)." 
          });
        }
        dadosAtualizacao.telefone = telefoneLimpo;
      }

      const [updated] = await usuariosRepository.atualizarUsuario(id, dadosAtualizacao);

      if (!updated) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const usuarioAtualizado = await usuariosRepository.buscarUsuarioPorId(id);
      const usuarioRetorno = usuarioAtualizado.toJSON();
      delete usuarioRetorno.senha;

      res.json({
        message: "Usuário atualizado com sucesso",
        usuario: usuarioRetorno
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  }

  async function atualizarPerfil(req, res) {
    try {
      const { id } = req.params;
      const dadosAtualizacao = req.body;
      const usuarioLogadoId = req.user.usuario_id;

      if (parseInt(id, 10) !== usuarioLogadoId) {
        return res.status(403).json({ error: "Não autorizado a editar este perfil." });
      }

      delete dadosAtualizacao.senha;
      delete dadosAtualizacao.role;
      delete dadosAtualizacao.usuario_id;
      delete dadosAtualizacao.foto_perfil;

      if (dadosAtualizacao.telefone) {
        const telefoneLimpo = dadosAtualizacao.telefone.replace(/\D/g, '');
        if (!/^\d{10,11}$/.test(telefoneLimpo)) {
          return res.status(400).json({ 
            error: "Telefone inválido. Use apenas números (10 ou 11 dígitos)." 
          });
        }
        dadosAtualizacao.telefone = telefoneLimpo;
      }

      const usuarioAtualizado = await usuariosRepository.atualizarPerfil(id, dadosAtualizacao);

      if (!usuarioAtualizado) {
        return res.status(404).json({ 
          error: "Usuário não encontrado ou nenhuma alteração realizada." 
        });
      }

      const usuarioRetorno = usuarioAtualizado.toJSON();
      delete usuarioRetorno.senha;

      res.json({
        message: "Perfil atualizado com sucesso!",
        usuario: usuarioRetorno
      });

    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({ error: "Erro interno ao atualizar perfil." });
    }
  }

  async function alterarSenha(req, res) {
    try {
      const { id } = req.params;
      const { senhaAtual, novaSenha } = req.body;
      const usuarioLogadoId = req.user.usuario_id;

      if (parseInt(id, 10) !== usuarioLogadoId) {
        return res.status(403).json({ error: "Não autorizado." });
      }

      if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ 
          error: "Senha atual e nova senha são obrigatórias." 
        });
      }

      const usuario = await usuariosRepository.buscarUsuarioPorIdComSenha(id);
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: "Senha atual incorreta." });
      }

      const senhaHash = await bcrypt.hash(novaSenha, 10);
      await usuariosRepository.atualizarUsuario(id, { senha: senhaHash });

      res.status(200).json({ message: "Senha alterada com sucesso." });

    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      res.status(500).json({ error: "Erro interno ao alterar senha." });
    }
  }

  async function atualizarFotoPerfil(req, res) {
    try {
      const { id } = req.params;
      const { foto_perfil } = req.body;
      const usuarioLogadoId = req.user.usuario_id;

      if (parseInt(id, 10) !== usuarioLogadoId) {
        return res.status(403).json({ error: "Não autorizado." });
      }

      if (!foto_perfil) {
        return res.status(400).json({ error: "Foto de perfil é obrigatória." });
      }

      if (!foto_perfil.startsWith('data:image')) {
        return res.status(400).json({ 
          error: "Formato inválido para a foto de perfil (deve ser base64 'data:image/...')" 
        });
      }

      if (foto_perfil.length > 5000000) {
        return res.status(400).json({ error: "Foto muito grande (máx 5MB)" });
      }

      const updatedUser = await usuariosRepository.atualizarFotoPerfil(id, foto_perfil);

      res.status(200).json({
        message: "Foto de perfil atualizada com sucesso!",
        usuario: updatedUser
      });
    } catch (error) {
      console.error("Erro ao atualizar foto de perfil:", error);
      res.status(500).json({ error: "Erro interno ao atualizar foto de perfil." });
    }
  }

  async function deletar(req, res) {
    try {
      const { id } = req.params;
      const deletado = await usuariosRepository.deletarUsuario(id);

      if (!deletado) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ error: "Erro ao excluir usuário" });
    }
  }

  return {
    cadastrar,
    logar,
    listar,
    buscarPorId,
    atualizar,
    atualizarPerfil,
    alterarSenha,
    atualizarFotoPerfil,
    deletar,
  };
}

module.exports = UsuarioController;