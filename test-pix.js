// teste-pix.js
require('dotenv').config();
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Configuração do cliente
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
    options: {
        timeout: 5000,
    }
});

const payment = new Payment(client);

// Corpo da requisição
const body = {
    transaction_amount: 97.00,
    description: 'Assinatura Mensal - Teste',
    payment_method_id: 'pix',
    payer: {
        email: 'thalisantunes@hotmail.com'
    }
};

// Função para testar
async function gerarPIX() {
    try {
        console.log('📱 Gerando PIX...');
        console.log('Body:', JSON.stringify(body, null, 2));
        
        const response = await payment.create({ body });
        
        console.log('✅ RESPOSTA COMPLETA:', JSON.stringify(response, null, 2));
        
        // Extrair informações importantes
        if (response) {
            console.log('\n🔹 INFORMAÇÕES DO PIX:');
            console.log('ID do pagamento:', response.id);
            console.log('Status:', response.status);
            console.log('QR Code (texto):', response.point_of_interaction?.transaction_data?.qr_code);
            console.log('QR Code (base64):', response.point_of_interaction?.transaction_data?.qr_code_base64);
            console.log('Copia e Cola:', response.point_of_interaction?.transaction_data?.qr_code);
            console.log('Data expiração:', response.date_of_expiration);
        }
        
    } catch (error) {
        console.error('❌ ERRO:', error);
        if (error.cause) {
            console.error('Causa:', error.cause);
        }
    }
}

// Executar
gerarPIX();