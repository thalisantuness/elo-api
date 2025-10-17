const express = require("express");
const router = express.Router();
router.use(express.json());
const authMiddleware = require("../middleware/auth");
const chatRepository = require("../repositories/chatRepository");
const { Usuario } = require("../model/Usuarios");

const UsuarioController = require("../controllers/usuariosController");
const usuariosController = UsuarioController();
const ChatController = require("../controllers/chatController");
const chatController = ChatController();
const ProdutoController = require("../controllers/produtoController");
const produtoController = ProdutoController();

router.post("/cadastrar", usuariosController.cadastrar);
router.post("/login", usuariosController.logar);
router.get("/usuarios", authMiddleware, usuariosController.listar);
router.get("/usuarios/:id", usuariosController.buscarPorId);
router.put("/usuarios/:id", usuariosController.atualizar);
router.patch("/usuarios/:id/perfil", authMiddleware, usuariosController.atualizarPerfil);
router.patch("/usuarios/:id/senha", authMiddleware, usuariosController.alterarSenha);
router.patch("/usuarios/:id/foto", authMiddleware, usuariosController.atualizarFotoPerfil);
router.delete("/usuarios/:id", usuariosController.deletar);

router.get("/produtos", produtoController.listar);
router.get("/produtos/:id", produtoController.buscarPorId);
router.post("/produtos", produtoController.criar);
router.put("/produtos/:id", produtoController.atualizar);
router.delete("/produtos/:id", produtoController.deletar);
router.post("/produtos/:id/fotos", produtoController.adicionarFoto);

// Rotas de Chat
router.get("/conversas", authMiddleware, chatController.listarConversas);
router.get("/conversas/:conversa_id/mensagens", authMiddleware, chatController.listarMensagens);
router.put("/mensagens/:mensagem_id/lida", authMiddleware, chatController.marcarComoLida);

router.post("/conversas", authMiddleware, async (req, res) => {
  try {
    const { frete_id, destinatario_id } = req.body;
    const usuario_id = req.user.usuario_id;

    if (!frete_id || !destinatario_id) {
      return res.status(400).json({ 
        error: "frete_id e destinatario_id são obrigatórios" 
      });
    }

    // Validar destinatário
    const destinatario = await Usuario.findByPk(destinatario_id);
    if (!destinatario) {
      return res.status(404).json({ error: "Destinatário não encontrado" });
    }

    // Validar roles (cliente só pode falar com empresa e vice-versa)
    if (
      (req.user.role === "cliente" && destinatario.role !== "empresa") ||
      (req.user.role === "empresa" && destinatario.role !== "cliente")
    ) {
      return res.status(400).json({
        error: "Conversas só são permitidas entre clientes e empresas",
      });
    }

    // Criar ou recuperar conversa
    const conversa = await chatRepository.criarConversaSeNaoExistir(
      usuario_id,
      destinatario_id,
      frete_id
    );

    // Buscar detalhes dos participantes
    const usuario1 = await Usuario.findByPk(conversa.usuario1_id, {
      attributes: ["usuario_id", "nome", "email", "role", "foto_perfil"],
    });
    const usuario2 = await Usuario.findByPk(conversa.usuario2_id, {
      attributes: ["usuario_id", "nome", "email", "role", "foto_perfil"],
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