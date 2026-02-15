const compraRepository = require('../repositories/compraRepository');
const { Usuario } = require('../model/Usuarios');
const { generateQRCode } = require('../services/qrCodeService');

function ComprasController() {
  async function listarCompras(req, res) {
    const { usuario_id, role } = req.user;
    try {
      let compras;
      if (role === 'admin') {
        compras = await compraRepository.listarCompras();
      } else if (role === 'empresa') {
        compras = await compraRepository.listarComprasPorEmpresa(usuario_id);
      } else if (role === 'cliente') {
        compras = await compraRepository.listarComprasPorCliente(usuario_id);
      } else {
        return res.status(403).json({ error: 'Role não autorizado para listar compras' });
      }
      res.status(200).json(compras);
    } catch (error) {
      console.error('Erro ao listar compras:', error);
      res.status(500).json({ error: 'Erro ao listar compras' });
    }
  }

  async function buscarCompraPorId(req, res) {
    const { id } = req.params;
    const { usuario_id, role } = req.user;
    try {
      const compra = await compraRepository.buscarCompraPorId(id, usuario_id, role);
      res.status(200).json(compra);
    } catch (error) {
      console.error(`Erro ao buscar compra com ID ${id}:`, error);
      res.status(404).json({ error: error.message });
    }
  }

  async function gerarQRCode(req, res) {
    const { valor, campanha_id } = req.body;
    const { usuario_id, role } = req.user;
    
    if (role !== 'empresa') {
      return res.status(403).json({ error: 'Apenas empresas podem gerar QR codes' });
    }
    
    if (!valor || valor <= 0) {
      return res.status(400).json({ error: 'Valor da compra é obrigatório e deve ser positivo' });
    }
    
    try {
      // Criar compra pendente
      const compra = await compraRepository.criarCompra({
        cliente_id: null,
        empresa_id: usuario_id,
        valor: parseFloat(valor),
        campanha_id: campanha_id || null
      });
      
      // Gerar QR code
      const qrCodeBase64 = await generateQRCode(compra.qr_code_data);
      
      res.status(201).json({
        message: 'QR code gerado com sucesso para compra pendente',
        compra_id: compra.compra_id,
        qr_code_base64: qrCodeBase64,
        qr_code_data: compra.qr_code_data,
        expira_em: compra.qr_code_expira_em,
        valor: compra.valor,
        pontos_estimados: compra.pontos_adquiridos
      });
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function claimCompra(req, res) {
    const { qr_code_data } = req.body;
    const { usuario_id, role } = req.user;
    
    if (role !== 'cliente') {
      return res.status(403).json({ error: 'Apenas clientes podem claimar compras' });
    }
    
    if (!qr_code_data) {
      return res.status(400).json({ error: 'Dados do QR code são obrigatórios' });
    }
    
    try {
      const resultado = await compraRepository.claimCompra(qr_code_data, usuario_id);
      res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao claimar compra:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async function atualizarCompra(req, res) {
    const { id } = req.params;
    const dadosAtualizados = req.body;
    const { usuario_id, role } = req.user;
    
    try {
      const compraAtualizada = await compraRepository.atualizarCompra(id, dadosAtualizados, usuario_id, role);
      res.status(200).json({
        message: 'Compra atualizada com sucesso',
        compra: compraAtualizada
      });
    } catch (error) {
      console.error(`Erro ao atualizar compra com ID ${id}:`, error);
      res.status(400).json({ error: error.message });
    }
  }

  async function excluirCompra(req, res) {
    const { id } = req.params;
    const { usuario_id, role } = req.user;
    
    try {
      await compraRepository.excluirCompra(id, usuario_id, role);
      res.status(200).json({ message: 'Compra excluída com sucesso' });
    } catch (error) {
      console.error(`Erro ao excluir compra com ID ${id}:`, error);
      res.status(400).json({ error: error.message });
    }
  }

  async function estatisticasEmpresa(req, res) {
    const { usuario_id, role } = req.user;
    
    if (role !== 'empresa' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas empresas podem ver estatísticas' });
    }
    
    try {
      const empresaId = role === 'admin' && req.query.empresa_id ? req.query.empresa_id : usuario_id;
      const estatisticas = await compraRepository.estatisticasEmpresa(empresaId);
      res.status(200).json(estatisticas);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: error.message });
    }
  }

  return {
    listarCompras,
    buscarCompraPorId,
    gerarQRCode,
    claimCompra,
    atualizarCompra,
    excluirCompra,
    estatisticasEmpresa,
  };
}

module.exports = ComprasController;