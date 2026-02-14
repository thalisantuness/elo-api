const QRCode = require('qrcode');
const crypto = require('crypto');
const { Compra } = require('../model/Compra');
const { Usuario } = require('../model/Usuarios');
const { canonicalize, generateSignature } = require('../utils/signature');

async function gerarQRCodeParaCompra(compra_id, usuario_id) {
  try {
    // Buscar compra
    const compra = await Compra.findOne({
      where: { compra_id },
      include: [
        { model: Usuario, as: 'cliente' },
        { model: Usuario, as: 'empresa' }
      ]
    });
    
    if (!compra) {
      throw new Error('Compra não encontrada');
    }
    
    // Verificar se usuário é da empresa ou admin
    if (compra.empresa_id !== usuario_id) {
      throw new Error('Apenas a empresa pode gerar QR Code para esta compra');
    }
    
    // Verificar se compra já foi validada
    if (compra.status !== 'pendente') {
      throw new Error('Compra já foi processada');
    }
    
    // Gerar assinatura digital
    const payload = JSON.parse(compra.qr_code_data);
    const secret = process.env.QR_CODE_SECRET || 'sua-chave-secreta-qrcode';
    const assinatura = generateSignature(payload, secret);
    
    const qrData = {
      ...payload,
      assinatura
    };
    
    // Gerar QR Code como base64
    const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData));
    
    return {
      qr_code_image: qrCodeImage,
      qr_code_id: compra.qr_code_id,
      compra_id: compra.compra_id,
      valor: compra.valor,
      cliente: compra.cliente ? compra.cliente.nome : 'Pendente',
      pontos_a_receber: compra.pontos_adquiridos,
      expira_em: compra.qr_code_expira_em,
      qr_data: qrData // Para debug/validação
    };
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    throw error;
  }
}

async function validarQRCodeDados(qr_code_data) {
  try {
    const dados = JSON.parse(qr_code_data);
    const { assinatura, ...payload } = dados;
    const secret = process.env.QR_CODE_SECRET || 'sua-chave-secreta-qrcode';
    const assinaturaEsperada = generateSignature(payload, secret);

    if (assinatura !== assinaturaEsperada) {
      return { valid: false, error: 'Assinatura inválida' };
    }

    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'QR Code expirado' };
    }

    return { valid: true, ...payload };
  } catch (error) {
    return { valid: false, error: 'QR Code inválido' };
  }
}

module.exports = {
  gerarQRCodeParaCompra,
  validarQRCodeDados
};