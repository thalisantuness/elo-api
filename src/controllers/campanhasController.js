const campanhasRepository = require('../repositories/campanhasRepository');

function CampanhasController() {
  // ==================== FUNÇÕES DE CAMPANHA ====================

  async function criar(req, res) {
    try {
      const { usuario_id, role } = req.user;
      
      // Verificar permissão (igual ao usuário)
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
      
      const { titulo, descricao, imagem_base64, recompensas, data_inicio, data_fim, ativa } = req.body;
      
      // Validações básicas (igual ao usuário)
      if (!titulo || !data_inicio || !data_fim) {
        return res.status(400).json({ 
          error: "titulo, data_inicio e data_fim são obrigatórios" 
        });
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
      
      const campanha = await campanhasRepository.criar({
        empresa_id,
        titulo,
        descricao,
        imagem_base64,  // Envia base64, o repository processa
        recompensas,
        data_inicio,
        data_fim,
        ativa,
      });
      
      res.status(201).json({
        message: "Campanha criada com sucesso",
        campanha
      });
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      res.status(500).json({ 
        error: "Erro ao criar campanha",
        details: error.message 
      });
    }
  }

  async function listar(req, res) {
    try {
      const { usuario_id, role } = req.user;
      
      if (role !== 'empresa' && role !== 'admin') {
        return res.status(403).json({ error: 'Apenas empresas ou administradores podem listar campanhas' });
      }
      
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
    try {
      const { id } = req.params;
      const { usuario_id, role } = req.user;
      
      if (role !== 'empresa' && role !== 'admin') {
        return res.status(403).json({ error: 'Apenas empresas ou administradores podem visualizar campanhas' });
      }
      
      const campanha = await campanhasRepository.buscarPorId(id);
      
      // Verificar permissão (igual ao usuário)
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
    try {
      const { id } = req.params;
      const { usuario_id, role } = req.user;
      
      if (role !== 'empresa' && role !== 'admin') {
        return res.status(403).json({ error: 'Apenas empresas ou administradores podem atualizar campanhas' });
      }
      
      // Verificar se a campanha existe e pertence à empresa (igual ao usuário)
      const campanhaExistente = await campanhasRepository.buscarPorId(id);
      
      if (role === 'empresa' && campanhaExistente.empresa_id !== usuario_id) {
        return res.status(403).json({ error: 'Você só pode atualizar campanhas da sua empresa' });
      }
      
      const { titulo, descricao, imagem_base64, recompensas, data_inicio, data_fim, ativa } = req.body;
      
      // Validar imagem se fornecida (igual ao usuário)
      if (imagem_base64 && !imagem_base64.startsWith('data:image') && imagem_base64 !== null) {
        return res.status(400).json({ 
          error: "Formato inválido para a imagem (deve ser base64 'data:image/...' ou null)" 
        });
      }
      
      if (imagem_base64 && imagem_base64.length > 5000000) {
        return res.status(400).json({ error: "Imagem muito grande (máx 5MB)" });
      }
      
      const campanhaAtualizada = await campanhasRepository.atualizar(id, {
        titulo,
        descricao,
        imagem_base64,  // Envia base64, o repository processa
        recompensas,
        data_inicio,
        data_fim,
        ativa,
      });
      
      res.json({
        message: "Campanha atualizada com sucesso",
        campanha: campanhaAtualizada
      });
    } catch (error) {
      if (error.message.includes('não encontrada')) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Erro ao atualizar campanha:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async function excluir(req, res) {
    try {
      const { id } = req.params;
      const { usuario_id, role } = req.user;
      
      if (role !== 'empresa' && role !== 'admin') {
        return res.status(403).json({ error: 'Apenas empresas ou administradores podem excluir campanhas' });
      }
      
      // Verificar se a campanha existe e pertence à empresa (igual ao usuário)
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

  // ==================== RETORNO DO CONTROLLER ====================
  return {
    criar,
    listar,
    buscarPorId,
    atualizar,
    excluir,
  };
}

module.exports = CampanhasController;