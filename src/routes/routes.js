const express = require("express");
const router = express.Router();
router.use(express.json());
const authMiddleware = require("../middleware/auth");
const chatRepository = require("../repositories/chatRepository"); // Import chatRepository
const { Usuario } = require("../model/Usuarios"); // Import Usuario for validation

const UsuarioController = require("../controllers/usuarioController");
const usuarioController = UsuarioController();
const ChatController = require("../controllers/chatController");
const chatController = ChatController();
const FreteController = require("../controllers/freteController");
const freteController = FreteController();
const SolicitacaoController = require("../controllers/solicitacaoController");
const solicitacaoController = SolicitacaoController();

router.post("/cadastrar", usuarioController.cadastrar);
router.post("/login", usuarioController.logar);
router.get("/usuarios", authMiddleware, usuarioController.listar);
router.get("/usuarios/:id", usuarioController.buscarPorId);
router.put("/usuarios/:id", usuarioController.atualizar);
router.patch("/usuarios/:id", authMiddleware, usuarioController.atualizarPerfil);
router.delete("/usuarios/:id", usuarioController.deletar);

router.patch("/usuarios/:id/alterar-senha", authMiddleware, usuarioController.alterarSenha);
router.patch("/usuarios/:id/documento", authMiddleware, usuarioController.atualizarDocumento);

router.post("/fretes", authMiddleware, freteController.criar);
router.get("/fretes", authMiddleware, freteController.listar);
router.get("/fretes/:id", freteController.buscarPorId);
router.put("/fretes/:id", authMiddleware, freteController.atualizar);
router.delete("/fretes/:id", authMiddleware, freteController.deletar);
router.get("/conversas", authMiddleware, chatController.listarConversas);
router.get("/conversas/:conversa_id/mensagens", authMiddleware, chatController.listarMensagens);
router.put("/mensagens/:mensagem_id/lida", authMiddleware, chatController.marcarComoLida);


router.post("/solicitacoes", authMiddleware, solicitacaoController.solicitar);
router.get("/solicitacoes/empresa", authMiddleware, solicitacaoController.listarPorEmpresa);
router.get("/solicitacoes/motorista", authMiddleware, solicitacaoController.listarPorMotorista);
router.put("/solicitacoes/:id/responder", authMiddleware, solicitacaoController.responder);

router.get("/documentos/motorista", authMiddleware, usuarioController.buscarDocumentosMotorista);

// New route to create a conversation
router.post("/conversas", authMiddleware, async (req, res) => {
  try {
    const { frete_id, destinatario_id } = req.body;
    const usuario_id = req.user.usuario_id;

    if (!frete_id || !destinatario_id) {
      return res.status(400).json({ error: "frete_id e destinatario_id são obrigatórios" });
    }

    // Validate recipient
    const destinatario = await Usuario.findByPk(destinatario_id);
    if (!destinatario) {
      return res.status(404).json({ error: "Destinatário não encontrado" });
    }

    // Validate roles (motorista can only talk to empresa, and vice versa)
    if (
      (req.user.role === "motorista" && destinatario.role !== "empresa") ||
      (req.user.role === "empresa" && destinatario.role !== "motorista")
    ) {
      return res.status(400).json({
        error: "Conversas só são permitidas entre motoristas e empresas",
      });
    }

    // Create or retrieve conversation
    const conversa = await chatRepository.criarConversaSeNaoExistir(
      usuario_id,
      destinatario_id,
      frete_id
    );




    // Fetch recipient details for response
    const usuario1 = await Usuario.findByPk(conversa.usuario1_id, {
      attributes: ["usuario_id", "nome_completo", "email", "role", "imagem_perfil"],
    });
    const usuario2 = await Usuario.findByPk(conversa.usuario2_id, {
      attributes: ["usuario_id", "nome_completo", "email", "role", "imagem_perfil"],
    });

    res.status(201).json({
      message: "Conversa criada com sucesso",
      conversa: {
        conversa_id: conversa.conversa_id,
        usuario1_id: conversa.usuario1_id,
        usuario2_id: conversa.usuario2_id,
        frete_id: conversa.frete_id,
        ultima_mensagem: conversa.ultima_mensagem,
        Usuario1: usuario1,
        Usuario2: usuario2,
      },
    });
  } catch (error) {
    console.error("Erro ao criar conversa:", error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;