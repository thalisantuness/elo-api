const regraRepository = require('../repositories/regrasRepository');

function regrasController() {
  async function criarRegra(req, res) {
    const { nome, tipo, valor_minimo, pontos, multiplicador } = req.body;
    const { usuario_id, role } = req.user;
    if (role !== 'empresa' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas empresas podem criar regras' });
    }
    try {
      const regra = await regraRepository.setRegraUnica({
        empresa_id: usuario_id,
        nome,
        tipo,
        valor_minimo,
        pontos,
        multiplicador
      });
      res.status(201).json(regra);
    } catch (error) {
      console.error('Erro ao criar regra:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function listarRegrasEmpresa(req, res) {
    const { usuario_id } = req.user;
    try {
      const regra = await regraRepository.getRegraUnica(usuario_id);
      res.status(200).json(regra ? [regra] : []);
    } catch (error) {
      console.error('Erro ao listar regras:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function listarRegrasPorEmpresaId(req, res) {
    const { empresa_id } = req.params;
    try {
      const regra = await regraRepository.getRegraUnica(empresa_id);
      res.status(200).json(regra ? [regra] : []);
    } catch (error) {
      console.error('Erro ao listar regras:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function criarRegrasPadrao(req, res) {
    const { usuario_id, role } = req.user;
    if (role !== 'empresa' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas empresas podem criar regras' });
    }
    try {
      const regra = await regraRepository.setRegraUnica({
        empresa_id: usuario_id,
        nome: 'Regra Padrão por Compra',
        tipo: 'por_compra',
        pontos: 1,
        ativa: true
      });
      res.status(201).json({
        message: 'Regra padrão criada e vinculada com sucesso',
        regra
      });
    } catch (error) {
      console.error('Erro ao criar regras padrão:', error);
      res.status(500).json({ error: error.message });
    }
  }

  return {
    criarRegra,
    listarRegrasEmpresa,
    listarRegrasPorEmpresaId,
    criarRegrasPadrao,
  };
}

module.exports = regrasController;