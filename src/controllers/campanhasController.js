const campanhasRepository = require('../repositories/campanhasRepository');

function campanhasController() {
  async function criar(req, res) {
    const { usuario_id, role } = req.user;
    if (role !== 'empresa' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas empresas ou administradores podem criar campanhas' });
    }
    let empresa_id;
    if (role === 'admin') {
      if (req.body.empresa_id == null) {
        return res.status(400).json({ error: 'Administrador deve informar empresa_id no body para criar campanha' });
      }
      empresa_id = req.body.empresa_id;
    } else {
      empresa_id = usuario_id;
    }
    const { titulo, descricao, imagem_url, recompensas, data_inicio, data_fim, ativa } = req.body;
    try {
      const campanha = await campanhasRepository.criar({
        empresa_id,
        titulo,
        descricao,
        imagem_url,
        recompensas,
        data_inicio,
        data_fim,
        ativa,
      });
      res.status(201).json(campanha);
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function listar(req, res) {
    const { usuario_id, role } = req.user;
    if (role !== 'empresa' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas empresas ou administradores podem listar campanhas' });
    }
    try {
      let campanhas;
      if (role === 'admin' && req.query.empresa_id != null) {
        campanhas = await campanhasRepository.listarPorEmpresa(req.query.empresa_id);
      } else if (role === 'empresa') {
        campanhas = await campanhasRepository.listarPorEmpresa(usuario_id);
      } else {
        campanhas = await campanhasRepository.listarTodas();
      }
      res.json(campanhas);
    } catch (error) {
      console.error('Erro ao listar campanhas:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function buscarPorId(req, res) {
    const { id } = req.params;
    const { usuario_id, role } = req.user;
    if (role !== 'empresa' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas empresas ou administradores podem visualizar campanhas' });
    }
    try {
      const campanha = await campanhasRepository.buscarPorId(id);
      if (role === 'empresa' && campanha.empresa_id !== usuario_id) {
        return res.status(403).json({ error: 'Você só pode visualizar campanhas da sua empresa' });
      }
      res.json(campanha);
    } catch (error) {
      if (error.message.includes('não encontrada')) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Erro ao buscar campanha:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function atualizar(req, res) {
    const { id } = req.params;
    const { usuario_id, role } = req.user;
    if (role !== 'empresa' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas empresas ou administradores podem atualizar campanhas' });
    }
    try {
      const campanha = await campanhasRepository.buscarPorId(id);
      if (role === 'empresa' && campanha.empresa_id !== usuario_id) {
        return res.status(403).json({ error: 'Você só pode atualizar campanhas da sua empresa' });
      }
      const { titulo, descricao, imagem_url, recompensas, data_inicio, data_fim, ativa } = req.body;
      const atualizada = await campanhasRepository.atualizar(id, {
        titulo,
        descricao,
        imagem_url,
        recompensas,
        data_inicio,
        data_fim,
        ativa,
      });
      res.json(atualizada);
    } catch (error) {
      if (error.message.includes('não encontrada')) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Erro ao atualizar campanha:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function excluir(req, res) {
    const { id } = req.params;
    const { usuario_id, role } = req.user;
    if (role !== 'empresa' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas empresas ou administradores podem excluir campanhas' });
    }
    try {
      const campanha = await campanhasRepository.buscarPorId(id);
      if (role === 'empresa' && campanha.empresa_id !== usuario_id) {
        return res.status(403).json({ error: 'Você só pode excluir campanhas da sua empresa' });
      }
      await campanhasRepository.excluir(id);
      res.json({ message: 'Campanha excluída com sucesso' });
    } catch (error) {
      if (error.message.includes('não encontrada')) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Erro ao excluir campanha:', error);
      res.status(500).json({ error: error.message });
    }
  }

  return {
    criar,
    listar,
    buscarPorId,
    atualizar,
    excluir,
  };
}

module.exports = campanhasController;