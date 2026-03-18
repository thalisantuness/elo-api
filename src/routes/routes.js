const express = require("express");
const router = express.Router();
router.use(express.json({ limit: '10mb' }));

const authMiddleware = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");

// Controllers
const UsuarioController = require("../controllers/usuariosController");
const usuariosController = UsuarioController();

const ChatController = require("../controllers/chatController");
const chatController = ChatController();

const ProdutoController = require("../controllers/produtoController");
const produtoController = ProdutoController();

const RecompensasController = require('../controllers/recompensasController');
const recompensasController = RecompensasController();

const SolicitacoesController = require("../controllers/solicitacoesController");
const solicitacoesController = SolicitacoesController();

const RegrasController = require('../controllers/regrasController');
const regrasController = RegrasController();

const CampanhasController = require('../controllers/campanhasController');
const campanhasController = CampanhasController();

const ComprasController = require('../controllers/comprasController');
const comprasController = ComprasController();

const assinaturaController = require('../controllers/assinaturaController');
// ==================== ROTAS PÚBLICAS ====================
router.post('/login', usuariosController.logar);
router.post('/usuarios', optionalAuth, usuariosController.cadastrar);
router.get('/cdls', usuariosController.listarCdls);
router.get('/cdls/:cdl_id/lojas', usuariosController.listarLojasDaCdl);
router.get('/produtos', optionalAuth, produtoController.listar);
router.get('/produtos/:id', produtoController.buscarPorId);

// ==================== ROTAS AUTENTICADAS ====================
router.use(authMiddleware);

// ==================== ROTAS DE USUÁRIOS ====================
router.get('/usuarios', usuariosController.listar);
router.get('/usuarios/:id', usuariosController.buscarPorId);
router.patch('/usuarios/:id/perfil', usuariosController.atualizarPerfil);
router.put('/usuarios/:id', usuariosController.atualizarPerfil);
router.patch('/usuarios/:id/senha', usuariosController.alterarSenha);
router.patch('/usuarios/:id/foto', usuariosController.atualizarFotoPerfil);
router.delete('/usuarios/:id', usuariosController.deletar);
router.put('/cliente/:id/trocar-cdl', usuariosController.trocarCdlDoCliente);
router.get('/empresas', usuariosController.listarEmpresas);
router.put('/minha-empresa', usuariosController.atualizarDadosEmpresa);

// ==================== ROTAS CDL ====================
router.get('/minha-cdl/dashboard', usuariosController.getDashboardCdl);
router.get('/admin/cdls/:cdl_id/dashboard', usuariosController.getDashboardCdl);
router.get('/minha-cdl/graficos', comprasController.graficosCdl);
router.get('/admin/cdls/:cdl_id/graficos', comprasController.graficosCdl);

// ==================== ROTAS ADMIN ====================
router.get('/admin/usuarios', usuariosController.visualizarUsuario);
router.put('/admin/tornar-admin', usuariosController.tornarAdmin);
router.put('/admin/tornar-cdl', usuariosController.tornarCdl);
router.put('/admin/aprovar-cdl/:id', usuariosController.aprovarCdl);
router.get('/admin/empresas', usuariosController.listarEmpresas);
router.put('/admin/usuarios/pontos/:id', usuariosController.givePoints);

// ==================== ROTAS DE PRODUTOS ====================
router.post('/produtos', produtoController.criar);
router.put('/produtos/:id', produtoController.atualizar);
router.delete('/produtos/:id', produtoController.deletar);
router.post('/produtos/:id/fotos', produtoController.adicionarFoto);
router.delete('/produtos/:id/fotos/:fotoId', produtoController.deletarFoto);

// ==================== ROTAS DE RECOMPENSAS ====================
router.post('/recompensas', recompensasController.cadastrarRecompensas);
router.get('/recompensas', recompensasController.visualizarRecompensas);
router.get('/recompensas/:recom_id', recompensasController.buscarRecompensaPorId);
router.put('/recompensas/:recom_id', recompensasController.atualizarRecompensas);
router.delete('/recompensas/:recom_id', recompensasController.excluirRecom);
router.get('/editar-recompensa/:id', recompensasController.buscarRecompensaPorId);
router.put('/editar-recompensa/:id', recompensasController.atualizarRecompensas);

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
router.get('/editar-campanha/:id', campanhasController.buscarPorId);
router.put('/editar-campanha/:id', campanhasController.atualizar);

// ==================== ROTAS DE COMPRAS ====================
router.get('/compras', comprasController.listarCompras);
router.get('/compras/:id', comprasController.buscarCompraPorId);
router.post('/qr-code', comprasController.gerarQRCode);
router.post('/compra', comprasController.claimCompra);
router.put('/compras/:id', comprasController.atualizarCompra);
router.delete('/compras/:id', comprasController.excluirCompra);
router.get('/minhas-estatisticas', comprasController.estatisticasEmpresa);
router.get('/big-numbers', comprasController.bigNumbers);

// Criar assinatura com cartão
router.post('/assinaturas', authMiddleware, assinaturaController.criarAssinatura.bind(assinaturaController));

// Listar minhas transações
router.get('/minhas-transacoes', authMiddleware, assinaturaController.listarMinhasTransacoes.bind(assinaturaController));

// Buscar transação por ID
router.get('/transacoes/:id', authMiddleware, assinaturaController.buscarTransacao.bind(assinaturaController));

// ADMIN: Listar todas transações
router.get('/admin/transacoes', authMiddleware, assinaturaController.listarTodasTransacoes.bind(assinaturaController));

// ==================== ROTAS DE CHAT ====================
router.get("/conversas", chatController.listarConversas);
router.get("/conversas/:conversa_id/mensagens", chatController.listarMensagens);
router.put("/mensagens/:mensagem_id/lida", chatController.marcarComoLida);


// ==================== ROTA 404 ====================
router.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

module.exports = router;