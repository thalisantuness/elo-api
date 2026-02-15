const recompensasRepository = require('../repositories/recompensasRepository');

function recompensasController() {
  async function visualizarRecompensas(req, res) {
    try {
      const usuario_id = req.user.usuario_id;
      const recompensas = await recompensasRepository.listarRecompensas(usuario_id);
      res.json(recompensas);
    } catch (error) {
      console.error('Erro ao obter recompensas:', error);
      res.status(500).json({ error: 'Erro ao obter recompensas' });
    }
  }

  async function cadastrarRecompensas(req, res) {
    try {
      const { nome, descricao, imagem_base64, pontos, estoque } = req.body;
      const usuario_id = req.user.usuario_id;
      
      if (!usuario_id) {
        return res.status(400).json({ error: 'ID de usuário não encontrado' });
      }

      if (!nome) {
        return res.status(400).json({ error: 'Nome da recompensa é obrigatório' });
      }

      // Validar imagem se fornecida (igual ao usuário)
      if (imagem_base64) {
        if (!imagem_base64.startsWith('data:image')) {
          return res.status(400).json({ 
            error: "Formato inválido para a imagem (deve ser base64 'data:image/...')" 
          });
        }
        if (imagem_base64.length > 5000000) { // 5MB
          return res.status(400).json({ error: "Imagem muito grande (máx 5MB)" });
        }
      }
      
      const recompensa = await recompensasRepository.criarRecompensa({
        nome,
        descricao,
        imagem_base64,  // Envia base64, o repository processa
        pontos: pontos || 0,
        estoque: estoque || 0,
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
    try {
      const { recom_id } = req.params;
      const { nome, descricao, imagem_base64, pontos, estoque } = req.body;
      
      // Validar imagem se fornecida (igual ao usuário)
      if (imagem_base64 && !imagem_base64.startsWith('data:image') && imagem_base64 !== null) {
        return res.status(400).json({ 
          error: "Formato inválido para a imagem (deve ser base64 'data:image/...' ou null)" 
        });
      }
      
      if (imagem_base64 && imagem_base64.length > 5000000) {
        return res.status(400).json({ error: "Imagem muito grande (máx 5MB)" });
      }
      
      const recompensaAtualizada = await recompensasRepository.atualizarRecompensa(recom_id, {
        nome,
        descricao,
        imagem_base64,  // Envia base64, o repository processa
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
    try {
      const { recom_id } = req.params;
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