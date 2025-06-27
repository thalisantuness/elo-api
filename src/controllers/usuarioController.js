const usuariosRepository = require("../repositories/usuariosRepository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.json");

function UsuarioController() {

async function cadastrar(req, res) {
    try {
        // Extrai os campos de imagens separadamente
        const { 
            imagem_perfil,
            comprovante_residencia_motorista,
            documento_dono_caminhao,
            comprovante_residencia_dono_caminhao,
            ...usuarioData
        } = req.body;

        // Prepara o objeto de documentos para upload
        const documentos = {
            comprovante_residencia_motorista,
            documento_dono_caminhao,
            comprovante_residencia_dono_caminhao
        };

        // Validações básicas
        if (!usuarioData.email || !usuarioData.senha || !usuarioData.role) {
            return res.status(400).json({ error: "Email, senha e role são obrigatórios" });
        }

        // Verifica se usuário já existe
        const usuarioExistente = await usuariosRepository.buscarUsuarioPorEmail(usuarioData.email);
        if (usuarioExistente) {
            return res.status(400).json({ error: "Email já cadastrado" });
        }

        // Validações específicas por role
        if (usuarioData.role === "motorista") {
            if (!usuarioData.cnh) {
                return res.status(400).json({ error: "CNH é obrigatória para motoristas" });
            }
        }

        // Cria o usuário
        const usuarioCriado = await usuariosRepository.criarUsuario({
            usuario: usuarioData,
            imagemBase64: imagem_perfil, // Envia apenas a string base64
            documentos // Envia o objeto de documentos
        });

        // Remove a senha do retorno
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

      const usuario = await usuariosRepository.buscarUsuarioPorEmail(email);
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Verifica senha
      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: "Senha incorreta" });
      }

      // Gera token JWT
      const token = jwt.sign(
        {
          usuario_id: usuario.usuario_id,
          role: usuario.role,
          email: usuario.email
        },
        authConfig.secret,
        { expiresIn: "24h" }
      );

      // Retorna dados seguros (sem senha)
      const resposta = {
        usuario: {
          usuario_id: usuario.usuario_id,
          email: usuario.email,
          role: usuario.role,
          nome_completo: usuario.nome_completo,
          imagem_perfil: usuario.imagem_perfil
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
      const usuarios = await usuariosRepository.listarUsuarios();
      res.json(usuarios.map(u => {
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

  async function atualizar(req, res) {
    try {
      const { id } = req.params;
      const dadosAtualizacao = req.body;

      // Remove campos que não devem ser atualizados
      delete dadosAtualizacao.senha;
      delete dadosAtualizacao.usuario_id;
      delete dadosAtualizacao.role; // Não permitir mudar o role

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
    deletar
  };
}

module.exports = UsuarioController;