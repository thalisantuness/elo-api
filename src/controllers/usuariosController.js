const usuariosRepository = require("../repositories/usuariosRepository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.json");
const { Op } = require("sequelize");

function UsuarioController() {
  // ==================== FUNÇÕES BÁSICAS ====================

  async function cadastrar(req, res) {
    try {
      const { 
        nome, telefone, email, senha, role, foto_perfil, 
        cliente_endereco, empresa_pai_id, cdl_id, cidade, estado,
        cnpj, endereco 
      } = req.body;

      // Validações básicas
      if (!nome || !email || !senha || !role) {
        return res.status(400).json({ 
          error: "Nome, email, senha e role são obrigatórios" 
        });
      }

      // Validar role
      const rolesPermitidas = ["cliente", "empresa", "admin", "cdl", "empresa-funcionario"];
      if (!rolesPermitidas.includes(role)) {
        return res.status(400).json({ 
          error: "Role inválido. Use: cliente, empresa, admin, cdl ou empresa-funcionario" 
        });
      }

      // Verificar email duplicado
      const usuarioExistente = await usuariosRepository.buscarUsuarioPorEmail(email);
      if (usuarioExistente) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }

      // Validar telefone
      if (telefone) {
        const telefoneLimpo = telefone.replace(/\D/g, '');
        if (!/^\d{10,11}$/.test(telefoneLimpo)) {
          return res.status(400).json({ 
            error: "Telefone inválido. Use apenas números (10 ou 11 dígitos)." 
          });
        }
      }

      // Validar foto
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

      // Lógica de vínculos baseada na role
      let empresaPaiIdFinal = empresa_pai_id || null;
      let cdlIdFinal = cdl_id || null;

      // Se for admin criando CDL
      if (req.user && req.user.role === 'admin' && role === 'cdl') {
        // Admin pode criar CDL sem vínculo
      }
      
      // Se for CDL criando loja
      else if (req.user && req.user.role === 'cdl' && role === 'empresa') {
        empresaPaiIdFinal = req.user.usuario_id;
        cdlIdFinal = req.user.usuario_id; // A loja também fica vinculada à CDL
      }
      
      // Se for cliente se cadastrando
      else if (role === 'cliente' && !cdl_id) {
        return res.status(400).json({ 
          error: "Cliente deve informar cdl_id (CDL da sua cidade)" 
        });
      }

      // Status baseado na role
      let status = 'ativo';
      if (role === 'empresa') status = 'pendente';
      if (role === 'cdl') status = 'pendente';

      const usuarioCriado = await usuariosRepository.criarUsuario({
        usuario: {
          nome,
          telefone: telefone ? telefone.replace(/\D/g, '') : null,
          email,
          senha,
          role,
          cliente_endereco: cliente_endereco || null,
          endereco: endereco || null,
          cidade: cidade || null,
          estado: estado || null,
          empresa_pai_id: empresaPaiIdFinal,
          cdl_id: cdlIdFinal,
          status,
          pontos: 0,
          cnpj: cnpj || null
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

      // Verificar status
      if (usuario.status === 'bloqueado') {
        return res.status(403).json({ error: "Usuário bloqueado" });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: "Senha incorreta" });
      }

      const token = jwt.sign(
        {
          usuario_id: usuario.usuario_id,
          role: usuario.role,
          email: usuario.email,
          cdl_id: usuario.cdl_id || usuario.empresa_pai_id || null
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
          pontos: usuario.pontos,
          status: usuario.status,
          cidade: usuario.cidade,
          estado: usuario.estado,
          cdl_id: usuario.cdl_id,
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
      const usuarios = await usuariosRepository.listarUsuariosComFiltros(req.user);
      
      res.json(usuarios.map((u) => {
        const usuario = u.toJSON();
        delete usuario.senha;
        return usuario;
      }));
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

  async function atualizarPerfil(req, res) {
    try {
      const { id } = req.params;
      const dadosAtualizacao = req.body;
      const usuarioLogadoId = req.user.usuario_id;

      if (parseInt(id, 10) !== usuarioLogadoId && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Não autorizado a editar este perfil." });
      }

      // Campos que não podem ser alterados diretamente
      delete dadosAtualizacao.senha;
      delete dadosAtualizacao.role;
      delete dadosAtualizacao.usuario_id;
      delete dadosAtualizacao.foto_perfil;
      delete dadosAtualizacao.pontos;
      delete dadosAtualizacao.status;
      delete dadosAtualizacao.cdl_id;
      delete dadosAtualizacao.empresa_pai_id;

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
      
      // Apenas admin pode deletar usuários
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Apenas administradores podem excluir usuários" });
      }
      
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

  // ==================== FUNÇÕES ESPECÍFICAS CDL ====================

  async function listarCdls(req, res) {
    try {
      const cdls = await usuariosRepository.listarCdlsAtivas();
      res.json(cdls);
    } catch (error) {
      console.error('Erro ao listar CDLs:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function listarLojasDaCdl(req, res) {
    try {
      const { cdl_id } = req.params;
      
      const cdl = await usuariosRepository.buscarCdlPorId(cdl_id);
      if (!cdl) {
        return res.status(404).json({ error: 'CDL não encontrada' });
      }
      
      const lojas = await usuariosRepository.listarLojasPorCdl(cdl_id);
      res.json({
        cdl: {
          id: cdl.usuario_id,
          nome: cdl.nome,
          cidade: cdl.cidade,
          estado: cdl.estado
        },
        lojas
      });
    } catch (error) {
      console.error('Erro ao listar lojas da CDL:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function getDashboardCdl(req, res) {
    try {
      if (req.user.role !== 'cdl' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas CDLs e administradores podem acessar' });
      }
      
      const cdl_id = req.user.role === 'admin' && req.params.cdl_id 
        ? req.params.cdl_id 
        : req.user.usuario_id;
      
      const dashboard = await usuariosRepository.getDashboardCdl(cdl_id);
      res.json(dashboard);
    } catch (error) {
      console.error('Erro ao carregar dashboard da CDL:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function trocarCdlDoCliente(req, res) {
    try {
      const { id } = req.params;
      const { nova_cdl_id } = req.body;
      
      if (req.user.role !== 'cliente' || req.user.usuario_id !== parseInt(id)) {
        return res.status(403).json({ error: 'Não autorizado' });
      }
      
      const clienteAtualizado = await usuariosRepository.trocarCdlDoCliente(id, nova_cdl_id);
      
      const clienteRetorno = clienteAtualizado.toJSON();
      delete clienteRetorno.senha;
      
      res.json({ 
        message: 'CDL alterada com sucesso',
        usuario: clienteRetorno 
      });
    } catch (error) {
      console.error('Erro ao trocar CDL do cliente:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== FUNÇÕES ADMINISTRATIVAS ====================

  async function visualizarUsuario(req, res) {
    try {
      const usuarios = await usuariosRepository.listarUsuarios();
      res.json(usuarios.map(u => {
        const usuario = u.toJSON();
        delete usuario.senha;
        return usuario;
      }));
    } catch (error) {
      console.error('Erro ao obter usuários:', error);
      res.status(500).json({ error: 'Erro ao obter usuários' });
    }
  }

  async function tornarAdmin(req, res) {
    const { id } = req.body;
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem promover usuários a admin' });
    }
    try {
      const usuarioAtualizado = await usuariosRepository.tornarUsuarioAdmin(id);
      const usuarioRetorno = usuarioAtualizado.toJSON();
      delete usuarioRetorno.senha;
      res.json({
        message: `Usuário com ID ${id} agora é administrador`,
        usuario: usuarioRetorno
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário para admin:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function tornarCdl(req, res) {
    const { id } = req.body;
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem criar CDLs' });
    }
    try {
      const usuarioAtualizado = await usuariosRepository.tornarUsuarioCdl(id);
      const usuarioRetorno = usuarioAtualizado.toJSON();
      delete usuarioRetorno.senha;
      res.json({
        message: `Usuário com ID ${id} agora é uma CDL (pendente aprovação)`,
        usuario: usuarioRetorno
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário para CDL:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function aprovarCdl(req, res) {
    const { id } = req.params;
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem aprovar CDLs' });
    }
    try {
      const usuarioAtualizado = await usuariosRepository.aprovarCdl(id);
      const usuarioRetorno = usuarioAtualizado.toJSON();
      delete usuarioRetorno.senha;
      res.json({
        message: `CDL com ID ${id} aprovada com sucesso`,
        usuario: usuarioRetorno
      });
    } catch (error) {
      console.error('Erro ao aprovar CDL:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function listarEmpresas(req, res) {
    try {
      let where = { role: 'empresa', status: 'ativo' };
      
      // Se for CDL, filtrar por suas lojas
      if (req.user.role === 'cdl') {
        where.empresa_pai_id = req.user.usuario_id;
      } else if (req.user.role === 'empresa') {
        where.usuario_id = { [Op.ne]: req.user.usuario_id };
      }
      
      const empresas = await usuariosRepository.listarEmpresas(where);
      res.json(empresas.map(e => {
        const empresa = e.toJSON();
        delete empresa.senha;
        return empresa;
      }));
    } catch (error) {
      console.error('Erro ao listar empresas:', error);
      res.status(500).json({ error: 'Erro ao listar empresas' });
    }
  }

  async function atualizarDadosEmpresa(req, res) {
    const dados = req.body;
    const { usuario_id, role } = req.user;
    if (role !== 'empresa') {
      return res.status(403).json({ error: 'Apenas empresas podem atualizar dados comerciais' });
    }
    try {
      const usuarioAtualizado = await usuariosRepository.atualizarDadosEmpresa(usuario_id, dados);
      const usuarioRetorno = usuarioAtualizado.toJSON();
      delete usuarioRetorno.senha;
      res.json({
        message: 'Dados da empresa atualizados com sucesso',
        usuario: usuarioRetorno
      });
    } catch (error) {
      console.error('Erro ao atualizar dados da empresa:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function givePoints(req, res) {
    const { id } = req.params;
    const { pontos } = req.body;
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem adicionar pontos' });
    }
    try {
      const usuarioAtualizado = await usuariosRepository.givePoints(id, pontos);
      const usuarioRetorno = usuarioAtualizado.toJSON();
      delete usuarioRetorno.senha;
      res.json({
        message: `Pontos adicionados com sucesso ao usuário ${usuarioAtualizado.nome}`,
        usuario: usuarioRetorno
      });
    } catch (error) {
      console.error('Erro ao adicionar pontos:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== RETORNO DO CONTROLLER ====================
  return {
    // Funções básicas
    cadastrar,
    logar,
    listar,
    buscarPorId,
    atualizarPerfil,
    alterarSenha,
    atualizarFotoPerfil,
    deletar,
    
    // Funções CDL
    listarCdls,
    listarLojasDaCdl,
    getDashboardCdl,
    trocarCdlDoCliente,
    
    // Funções administrativas
    visualizarUsuario,
    tornarAdmin,
    tornarCdl,
    aprovarCdl,
    listarEmpresas,
    atualizarDadosEmpresa,
    givePoints,
  };
}

module.exports = UsuarioController;