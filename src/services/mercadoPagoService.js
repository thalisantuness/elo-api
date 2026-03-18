const { MercadoPagoConfig, Payment } = require('mercadopago');
const logger = require('./logger');

class MercadoPagoService {
  constructor() {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
      options: { timeout: 5000 }
    });
    this.payment = new Payment(this.client);
    
    logger.info('Mercado Pago service inicializado', {
      token_preview: process.env.MP_ACCESS_TOKEN?.substring(0, 10) + '...',
      environment: process.env.NODE_ENV
    });
  }

  async processarPagamentoCartao({ valor, descricao, email, cardToken }) {
    const timer = logger.timer('mp_pagamento');
    
    try {
      logger.info('Iniciando pagamento com cartão', {
        valor,
        descricao,
        email,
        card_token_preview: cardToken?.substring(0, 10) + '...'
      });

      const body = {
        transaction_amount: parseFloat(valor),
        description: descricao,
        payment_method_id: 'master',
        token: cardToken,
        installments: 1,
        payer: { email }
      };

      logger.debug('Payload Mercado Pago', { body });

      const response = await this.payment.create({ body });
      const duration = timer.end({ status: response.status });

      logger.info('Pagamento processado com sucesso', {
        payment_id: response.id,
        status: response.status,
        status_detail: response.status_detail,
        duration_ms: duration
      });

      // Métrica de sucesso
      logger.metric('mp_pagamento_sucesso', 1, {
        status: response.status,
        bandeira: 'master'
      });

      return {
        id: response.id,
        status: response.status,
        status_detail: response.status_detail,
        approved: response.status === 'approved'
      };

    } catch (error) {
      const duration = timer.end({ error: true });
      
      logger.error('Falha no pagamento Mercado Pago', {
        error,
        valor,
        email,
        duration_ms: duration
      });

      // Métrica de erro
      logger.metric('mp_pagamento_erro', 1, {
        codigo: error.cause?.[0]?.code || 'unknown',
        status: error.status
      });

      throw error;
    }
  }

  async buscarPagamento(paymentId) {
    const timer = logger.timer('mp_busca_pagamento');
    
    try {
      logger.debug('Buscando pagamento', { payment_id: paymentId });
      
      const response = await this.payment.get({ id: paymentId });
      const duration = timer.end();

      logger.info('Pagamento encontrado', {
        payment_id: paymentId,
        status: response.status,
        duration_ms: duration
      });

      return response;
    } catch (error) {
      timer.end({ error: true });
      
      logger.error('Erro ao buscar pagamento', {
        error,
        payment_id: paymentId
      });
      
      throw error;
    }
  }
}

module.exports = new MercadoPagoService();