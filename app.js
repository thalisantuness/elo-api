const express = require('express');

// CAPTURAR QUALQUER ERRO ANTES DE TUDO
process.on('uncaughtException', (error) => {
  console.error('💥💥💥 UNCAUGHT EXCEPTION:', error);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥💥💥 UNHANDLED REJECTION:', reason);
  process.exit(1);
});

console.log('🚀 INICIANDO APLICAÇÃO...');

let logger;
let requestLogger;

try {
  logger = require('./src/services/logger');
  console.log('✅ Logger carregado');
} catch (error) {
  console.error('❌ Erro ao carregar logger:', error);
  process.exit(1);
}

try {
  requestLogger = require('./src/middleware/requestLogger');
  console.log('✅ RequestLogger carregado');
} catch (error) {
  console.error('❌ Erro ao carregar requestLogger:', error);
  process.exit(1);
}

const app = express();

// Log de inicialização
logger.info('Iniciando aplicação', {
  node_version: process.version,
  platform: process.platform,
  memory_limit: process.memoryUsage().heapTotal
});

// Middleware para logar TODAS as requisições
app.use((req, res, next) => {
  console.log(`\n📨 REQUISIÇÃO RECEBIDA: ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Rotas
try {
  const routes = require('./src/routes/routes');
  app.use('/api', routes);
  console.log('✅ Rotas carregadas');
} catch (error) {
  console.error('❌ Erro ao carregar rotas:', error);
  process.exit(1);
}

// Rota de teste simples (SEM AUTH)
app.get('/test', (req, res) => {
  console.log('✅ Rota /test chamada');
  res.json({ message: 'Servidor funcionando!' });
});

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀🚀🚀 SERVIDOR RODANDO NA PORTA ${PORT} 🚀🚀🚀`);
  console.log(`📍 Teste: http://localhost:${PORT}/test`);
  console.log(`📍 API: http://localhost:${PORT}/api\n`);
});

server.on('error', (error) => {
  console.error('💥 ERRO NO SERVIDOR:', error);
});

console.log('✅ App configurado, aguardando requisições...');