const chatRepository = require("../repositories/chatRepository");
const {Conversa} = require("../model/Conversa");
const {Frete} = require("../model/Frete");
const {Usuario} = require("../model/Usuarios");
const { Sequelize } = require("sequelize");

function ChatController() {
async function listarConversas(req, res) {
  try {
    const usuario_id = req.user.usuario_id;
    
    const conversas = await chatRepository.listarConversasComFretes(usuario_id);
    
    res.json(conversas);
  } catch (error) {
    console.error("Erro ao listar conversas:", error);
    res.status(500).json({ error: "Erro ao listar conversas" });
  }
}

  async function listarMensagens(req, res) {
    try {
      const { conversa_id } = req.params;
      const usuario_id = req.user.usuario_id;
      const mensagens = await chatRepository.listarMensagens(
        conversa_id,
        usuario_id
      );
      res.json(mensagens);
    } catch (error) {
      console.error("Erro ao listar mensagens:", error);
      res.status(400).json({ error: error.message });
    }
  }

  async function marcarComoLida(req, res) {
    try {
      const { mensagem_id } = req.params;
      const usuario_id = req.user.usuario_id;
      await chatRepository.marcarMensagemComoLida(mensagem_id, usuario_id);
      res.json({ message: "Mensagem marcada como lida" });
    } catch (error) {
      console.error("Erro ao marcar mensagem como lida:", error);
      res.status(400).json({ error: error.message });
    }
  }

  async function listarConversasComFretes(req, res) {
    const usuario_id = req.user.usuario_id
    const userId = typeof usuario_id === 'object' ? usuario_id.usuario_id : usuario_id;
  return await Conversa.findAll({
    where: {
       [Sequelize.Op.or]: [
        { usuario1_id: userId }, 
        { usuario2_id: userId }   
      ]
    },
    include: [
      {
        model: Frete,
        as: "Frete", // Add the alias here
        required: true,
        include: [
          {
            association: "Empresa",
            attributes: ["usuario_id", "nome_completo", "imagem_perfil"]
          },
          {
            association: "Motorista",
            attributes: ["usuario_id", "nome_completo", "imagem_perfil"]
          }
        ]
      },
      {
        model: Usuario,
        as: "Usuario1",
        attributes: ["usuario_id", "nome_completo", "imagem_perfil", "role"]
      },
      {
        model: Usuario,
        as: "Usuario2",
        attributes: ["usuario_id", "nome_completo", "imagem_perfil", "role"]
      }
    ],
    order: [["ultima_mensagem", "DESC"]]
  });
}

  return {
    listarConversas,
    listarMensagens,
    marcarComoLida,
 listarConversasComFretes

  };
}

module.exports = ChatController;
