const { MercadoPagoConfig, Payment } = require('mercadopago');

class MercadoPagoService {
  constructor() {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
      options: { timeout: 5000 }
    });
    this.payment = new Payment(this.client);
    console.log('✅ Mercado Pago configurado para cartão');
  }

async processarPagamentoCartao({ valor, descricao, email, cardToken }) {
  try {
    const body = {
      transaction_amount: parseFloat(valor),
      description: descricao,
      payment_method_id: 'master',
      token: cardToken,
      installments: 1,  // ← ADICIONE ESTA LINHA! (1 = à vista)
      payer: { email }
    };

    console.log('💳 Processando pagamento com cartão...');
    
    const response = await this.payment.create({ body });
    
    return {
      id: response.id,
      status: response.status,
      status_detail: response.status_detail,
      approved: response.status === 'approved'
    };
  } catch (error) {
    console.error('❌ Erro no pagamento:', error);
    throw error;
  }
}

  // Buscar pagamento
  async buscarPagamento(paymentId) {
    try {
      const response = await this.payment.get({ id: paymentId });
      return response;
    } catch (error) {
      console.error('❌ Erro ao buscar pagamento:', error);
      throw error;
    }
  }
}

module.exports = new MercadoPagoService();