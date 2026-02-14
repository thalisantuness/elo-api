const express = require("express");
const router = express.Router();
router.use(express.json({ limit: '10mb' })); // Aumentado limite para upload de fotos

const authMiddleware = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const chatRepository = require("../repositories/chatRepository");
const { Usuario } = require("../model/Usuarios");

// ==================== IMPORTS DOS CONTROLLERS ====================

// Controllers existentes
const UsuarioController = require("../controllers/usuariosController");
const usuariosController = UsuarioController();

const ChatController = require("../controllers/chatController");
const chatController = ChatController();

const ProdutoController = require("../controllers/produtoController");
const produtoController = ProdutoController();

// Novos controllers do sistema de pontos e recompensas
const RecompensasController = require('../controllers/recompensasController');
const recompensasController = RecompensasController();

const SolicitacoesController = require("../controllers/solicitacoesController");
const solicitacoesController = SolicitacoesController();

const RegrasController = require('../controllers/regrasController');
const regrasController = RegrasController();

const CampanhasController = require('../controllers/campanhasController');
const campanhasController = CampanhasController();

// ==================== FUNÇÃO AUXILIAR PARA CHAT ====================

function validarPermissaoConversa(roleRemetente, roleDestinatario) {
  // Admin pode conversar com qualquer um
  if (roleRemetente === 'admin') {
    return true;
  }
  
  // Cliente só pode conversar com empresa ou funcionário
  if (roleRemetente === 'cliente' && (roleDestinatario === 'empresa' || roleDestinatario === 'empresa-funcionario')) {
    return true;
  }
  
  // Empresa só pode conversar com cliente
  if (roleRemetente === 'empresa' && roleDestinatario === 'cliente') {
    return true;
  }
  
  // Funcionário só pode conversar com cliente
  if (roleRemetente === 'empresa-funcionario' && roleDestinatario === 'cliente') {
    return true;
  }
  
  return false;
}

// ==================== ROTAS PÚBLICAS ====================

// Autenticação
router.post("/cadastrar", usuariosController.cadastrar);
router.post("/login", usuariosController.logar);

// Usuários (público - apenas busca por ID)
router.get("/usuarios/:id", usuariosController.buscarPorId);

// Produtos (público - listagem e busca)
router.get("/produtos", optionalAuth, produtoController.listar);
router.get("/produtos/:id", produtoController.buscarPorId);

// ==================== ROTAS AUTENTICADAS ====================
// Todas as rotas abaixo requerem autenticação
router.use(authMiddleware);

// ==================== ROTAS DE USUÁRIOS ====================

// Listagem de usuários (com filtros por role)
router.get("/usuarios", usuariosController.listar);

// Atualizações de perfil
router.put("/usuarios/:id", usuariosController.atualizar);
router.patch("/usuarios/:id/perfil", usuariosController.atualizarPerfil);
router.patch("/usuarios/:id/senha", usuariosController.alterarSenha);
router.patch("/usuarios/:id/foto", usuariosController.atualizarFotoPerfil);

// Exclusão de usuário
router.delete("/usuarios/:id", usuariosController.deletar);

// Rotas administrativas de usuários
router.get("/visualizar-usuarios", usuariosController.visualizarUsuario);
router.put("/usuarios/admin", usuariosController.tornarAdmin);
router.put("/usuarios/empresa", usuariosController.tornarEmpresa);
router.put("/usuarios/empresa/:id/aprovar", usuariosController.aprovarEmpresa);
router.get("/empresas", usuariosController.listarEmpresas);
router.put("/minha-empresa", usuariosController.atualizarDadosEmpresa);
router.put("/usuarios/pontos/:id", usuariosController.givePoints);

// ==================== ROTAS DE PRODUTOS ====================

router.post("/produtos", produtoController.criar);
router.put("/produtos/:id", produtoController.atualizar);
router.delete("/produtos/:id", produtoController.deletar);
router.post("/produtos/:id/fotos", produtoController.adicionarFoto);
router.delete("/produtos/:id/fotos/:fotoId", produtoController.deletarFoto);

// ==================== ROTAS DE CHAT ====================

router.get("/conversas", chatController.listarConversas);
router.get("/conversas/:conversa_id/mensagens", chatController.listarMensagens);
router.put("/mensagens/:mensagem_id/lida", chatController.marcarComoLida);

// Rota para criar nova conversa
router.post("/conversas", async (req, res) => {
  try {
    const { destinatario_id } = req.body;
    const usuario_id = req.user.usuario_id;

    if (!destinatario_id) {
      return res.status(400).json({ 
        error: "destinatario_id é obrigatório" 
      });
    }

    const destinatario = await Usuario.findByPk(destinatario_id);
    if (!destinatario) {
      return res.status(404).json({ error: "Destinatário não encontrado" });
    }

    const podeConversar = validarPermissaoConversa(req.user.role, destinatario.role);
    if (!podeConversar) {
      return res.status(400).json({
        error: "Conversa não permitida entre estes tipos de usuário",
      });
    }

    let usuario1_id, usuario2_id;
    
    if (req.user.role === 'cliente') {
      const normalizada = await chatRepository.normalizarConversa(usuario_id, destinatario_id);
      usuario1_id = normalizada.usuario1_id;
      usuario2_id = normalizada.usuario2_id;
    } else if (req.user.role === 'empresa' || req.user.role === 'empresa-funcionario') {
      const empresaPaiId = await chatRepository.buscarEmpresaPaiId(usuario_id);
      if (!empresaPaiId) {
        return res.status(400).json({ error: "Empresa não encontrada" });
      }
      usuario1_id = destinatario_id;
      usuario2_id = empresaPaiId;
    } else {
      return res.status(403).json({ error: "Apenas clientes, empresas e funcionários podem criar conversas" });
    }

    const conversa = await chatRepository.criarConversaSeNaoExistir(
      usuario1_id,
      usuario2_id
    );

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

// ==================== ROTAS DE RECOMPENSAS ====================

router.post('/recompensas', recompensasController.cadastrarRecompensas);
router.get('/recompensas', recompensasController.visualizarRecompensas);
router.put('/recompensas/:recom_id', recompensasController.atualizarRecompensas);
router.delete('/recompensas/:recom_id', recompensasController.excluirRecom);

// ==================== ROTAS DE SOLICITAÇÕES ====================

router.get('/solicitacoes', solicitacoesController.listarSolicitacoes);
router.post('/solicitacoes', solicitacoesController.criarSolicitacao);
router.put('/solicitacoes/processar/:id', solicitacoesController.processarSolicitacao);

// ==================== ROTAS DE REGRAS ====================

router.post('/regras', regrasController.criarRegra);
router.get('/minhas-regras', regrasController.listarRegrasEmpresa);
router.get('/empresas/:empresa_id/regras', regrasController.listarRegrasPorEmpresaId);
router.post('/regras-padrao', regrasController.criarRegrasPadrao);

// ==================== ROTAS DE CAMPANHAS ====================

router.post('/campanhas', campanhasController.criar);
router.get('/campanhas', campanhasController.listar);
router.get('/campanhas/:id', campanhasController.buscarPorId);
router.put('/campanhas/:id', campanhasController.atualizar);
router.delete('/campanhas/:id', campanhasController.excluir);

// ==================== ROTA 404 ====================

router.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

module.exports = router;