const { Usuario } = require("../model/Usuarios");
const usuariosRepository = require("../repositories/usuariosRepository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.json");
const sharp = require("sharp");

function UsuarioController() {
  async function cadastrar(req, res) {
    try {
      const { usuario, dadosMotorista } = req.body;

      // Validação adicional pode ser feita aqui
      if (!dadosMotorista.cnh) {
        return res.status(400).json({ error: "CNH é obrigatória para motoristas" });
      }

      const usuarioCriado = await usuariosRepository.criarUsuarioComPerfil({
        usuario,
        dadosMotorista
      });

      res.status(201).json({
        message: "Usuário cadastrado com sucesso",
        usuario: {
          usuario_id: usuarioCriado.usuario_id,
          email: usuarioCriado.email,
          role: usuarioCriado.role
        }
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

      const usuario = await usuariosRepository.buscarUsuarioComPerfil(email);
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Verifica senha
      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: "Senha incorreta" });
      }

      // Gera token JWT com informações do perfil
      const token = jwt.sign(
        {
          usuario_id: usuario.usuario_id,
          role: usuario.role,
          perfil: usuario.motorista ? {
            nome: usuario.motorista.nome,
            cnh: usuario.motorista.cnh
          } : null
        },
        authConfig.secret,
        { expiresIn: "24h" }
      );

      // Retorna dados seguros (sem senha)
      const resposta = {
        usuario: {
          usuario_id: usuario.usuario_id,
          email: usuario.email,
          role: usuario.role
        },
        motorista: usuario.motorista,
        token
      };

      res.json(resposta);
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ error: "Erro no login" });
    }
  }

  return {
    cadastrar,
    logar
  };
}

module.exports = UsuarioController();