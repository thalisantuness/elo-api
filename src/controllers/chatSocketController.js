const { Conversa } = require("../model/Conversa");
const { Mensagem } = require("../model/Mensagem");
const { Frete } = require("../model/Frete");
const { Usuario } = require("../model/Usuarios");
const { Sequelize } = require("sequelize");
const chatRepository = require("../repositories/chatRepository");

function ChatSocketController(io) {
  const handleSocketConnection = (socket) => {
    console.log(`Socket conectado: ${socket.id}, Usuário: ${socket.user.email}`);

    // Join user-specific room
    socket.join(`user:${socket.user.usuario_id}`);

    socket.on("sendMessage", async (data) => {
      const { destinatario_id, conteudo, frete_id } = data;

      try {
        // Validar entrada
        if (!destinatario_id || !conteudo || !frete_id) {
          throw new Error("Dados incompletos: destinatario_id, conteudo e frete_id são obrigatórios");
        }

        // Verificar destinatário
        const destinatario = await Usuario.findByPk(destinatario_id);
        if (!destinatario) {
          throw new Error("Destinatário não encontrado");
        }

        // Verificar papéis (motorista <-> empresa)
        if (
          (socket.user.role === "motorista" && destinatario.role !== "empresa") ||
          (socket.user.role === "empresa" && destinatario.role !== "motorista")
        ) {
          throw new Error("Conversas só são permitidas entre motoristas e empresas");
        }

        // Verificar se há frete vinculando os usuários
        const frete = await Frete.findOne({
          where: {
            frete_id,
            [Sequelize.Op.or]: [
              {
                empresa_id: socket.user.usuario_id,
                motorista_id: destinatario_id,
              },
              {
                empresa_id: destinatario_id,
                motorista_id: socket.user.usuario_id,
              },
            ],
          },
        });

        if (!frete) {
          throw new Error("Não há frete vinculando estes usuários");
        }

        // Criar ou obter conversa
        const conversa = await chatRepository.criarConversaSeNaoExistir(
          socket.user.usuario_id,
          destinatario_id,
          frete_id
        );

        // Salvar mensagem no banco de dados
        const mensagem = await Mensagem.create({
          conversa_id: conversa.conversa_id,
          remetente_id: socket.user.usuario_id,
          conteudo,
          data_envio: new Date(),
        });

        const mensagemData = {
          mensagem_id: mensagem.mensagem_id,
          conversa_id: conversa.conversa_id,
          remetente_id: socket.user.usuario_id,
          conteudo,
          data_envio: mensagem.data_envio,
          lida: mensagem.lida,
        };

        // Emitir mensagem para o destinatário e o remetente
        io.to(`user:${destinatario_id}`).emit("receivedMessage", mensagemData);
        socket.emit("receivedMessage", mensagemData);
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error.message);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket desconectado: ${socket.id}`);
    });
  };

  return { handleSocketConnection };
}

module.exports = ChatSocketController;