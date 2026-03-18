const logger = require('../services/logger');

const requestLogger = (req, res, next) => {
  console.log('🔥 MIDDLEWARE REQUEST LOGGER - INICIO');
  console.log(`📨 ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  
  // AGORA O BODY JÁ FOI PROCESSADO PELO express.json()
  console.log('Body:', req.body); 
  
  const start = Date.now();
  
  // Intercepta o res.json para logar depois
  const originalJson = res.json;
  res.json = function(data) {
    console.log('🔥 MIDDLEWARE REQUEST LOGGER - RES.JSON');
    
    const duration = Date.now() - start;
    
    try {
      // Log da requisição
      logger.httpRequest(req, res, duration);
      
      // Log específico para erros
      if (res.statusCode >= 400) {
        logger.warn('Requisição com erro', {
          path: req.url,
          status: res.statusCode,
          error: data.error || data.message,
          duration_ms: duration
        });
      }
      
      // Métricas por endpoint
      logger.metric('request_count', 1, {
        endpoint: req.route?.path || req.url,
        method: req.method,
        status: res.statusCode.toString()
      });
    } catch (error) {
      console.error('❌ ERRO NO LOGGER:', error);
    }
    
    return originalJson.call(this, data);
  };
  
  console.log('🔥 MIDDLEWARE REQUEST LOGGER - NEXT');
  next();
};

module.exports = requestLogger;