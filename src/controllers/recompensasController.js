const recompensasRepository = require('../repositories/recompensasRepository');

function recompensasController() {
  async function visualizarRecompensas(req, res) {
    const usuario_id = req.user.usuario_id;
    try {
      const recompensas = await recompensasRepository.listarRecompensas(usuario_id);
      res.json(recompensas);
    } catch (error) {
      console.error('Erro ao obter recompensas:', error);
      res.status(500).json({ error: 'Erro ao obter recompensas' });
    }
  }

  async function cadastrarRecompensas(req, res) {
    const { nome, pontos, estoque } = req.body;
    const usuario_id = req.user.usuario_id;
    if (!usuario_id) {
      return res.status(400).json({ error: 'ID de usuário não encontrado' });
    }
    try {
      const recompensa = await recompensasRepository.criarRecompensa({
        nome,
        pontos,
        estoque,
        usuario_id,
      });
      res.status(201).json({ 
        message: `Recompensa ${nome} cadastrada com sucesso`, 
        recompensa 
      });
    } catch (error) {
      console.error('Erro ao cadastrar recompensa:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function atualizarRecompensas(req, res) {
    const { recom_id } = req.params;
    const { nome, pontos, estoque } = req.body;
    try {
      const recompensaAtualizada = await recompensasRepository.atualizarRecompensa(recom_id, {
        nome,
        pontos,
        estoque,
      });
      res.json({ 
        message: `Recompensa ${recom_id} atualizada com sucesso`,
        recompensa: recompensaAtualizada 
      });
    } catch (error) {
      console.error('Erro ao atualizar recompensa:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function excluirRecom(req, res) {
    const { recom_id } = req.params;
    try {
      await recompensasRepository.excluirRecompensa(recom_id);
      res.json({ message: `Recompensa ${recom_id} excluída com sucesso` });
    } catch (error) {
      console.error('Erro ao excluir recompensa:', error);
      res.status(500).json({ error: error.message });
    }
  }

  return {
    visualizarRecompensas,
    cadastrarRecompensas,
    atualizarRecompensas,
    excluirRecom,
  };
}

module.exports = recompensasController;