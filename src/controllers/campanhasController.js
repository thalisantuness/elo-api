const campanhasRepository = require('../repositories/campanhasRepository');
const usuariosRepository = require('../repositories/usuariosRepository');

function CampanhasController() {
  async function criar(req, res) {
    try {
      const { usuario_id, role } = req.user;
      
      if (role !== 'empresa' && role !== 'cdl' && role !== 'admin') {
        return res.status(403).json({ error: 'Apenas empresas, CDLs ou administradores podem criar campanhas' });
      }
      
      let empresa_id;
      if (role === 'admin') {
        if (!req.body.empresa_id) {
          return res.status(400).json({ error: 'Administrador deve informar empresa_id no body para criar campanha' });
        }
        empresa_id = req.body.empresa_id;
      } else {
        empresa_id = usuario_id;
      }
      
      const { titulo, descricao, imagem_base64, produtos, recompensas, data_inicio, data_fim, ativa } = req.body;
      
      if (!titulo || !data_inicio || !data_fim) {
        return res.status(400).json({ 
          error: "titulo, data_inicio e data_fim são obrigatórios" 
        });
      }

      if (imagem_base64) {
        if (!imagem_base64.startsWith('data:image')) {
          return res.status(400).json({ 
            error: "Formato inválido para a imagem (deve ser base64 'data:image/...')" 
          });
        }
        if (imagem_base64.length > 5000000) {
          return res.status(400).json({ error: "Imagem muito grande (máx 5MB)" });
        }
      }
      
      const campanha = await campanhasRepository.criar({
        empresa_id,
        titulo,
        descricao,
        imagem_base64,
        produtos: produtos || [],
        recompensas: recompensas || [],
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
      
      let campanhas = [];
      
      switch (role) {
        case 'admin':
          // Admin vê todas as campanhas
          campanhas = await campanhasRepository.listarTodas();
          break;
          
        case 'cdl':
          // CDL vê campanhas dela e das suas lojas
          campanhas = await campanhasRepository.listarPorCdl(usuario_id);
          break;
          
        case 'empresa':
          // Loja vê apenas suas próprias campanhas
          campanhas = await campanhasRepository.listarPorEmpresa(usuario_id);
          break;
          
        case 'cliente':
          // Cliente vê campanhas ativas da sua CDL e das lojas da CDL
          const cliente = await usuariosRepository.buscarUsuarioPorId(usuario_id);
          if (cliente && cliente.cdl_id) {
            campanhas = await campanhasRepository.listarPorCliente(cliente.cdl_id);
          }
          break;
          
        default:
          return res.status(403).json({ error: 'Não autorizado' });
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
      const campanha = await campanhasRepository.buscarPorId(id);
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
      
      const campanhaExistente = await campanhasRepository.buscarPorId(id);
      
      // Verificar permissão
      if (role === 'empresa' && campanhaExistente.empresa_id !== usuario_id) {
        return res.status(403).json({ error: 'Você só pode atualizar suas próprias campanhas' });
      }
      
      if (role === 'cdl') {
        // Verificar se a campanha é da CDL ou de alguma loja dela
        const empresa = await usuariosRepository.buscarUsuarioPorId(campanhaExistente.empresa_id);
        if (empresa.cdl_id !== usuario_id && campanhaExistente.empresa_id !== usuario_id) {
          return res.status(403).json({ error: 'Você só pode atualizar campanhas suas ou das suas lojas' });
        }
      }
      
      if (role !== 'admin' && role !== 'cdl' && role !== 'empresa') {
        return res.status(403).json({ error: 'Não autorizado' });
      }
      
      const { titulo, descricao, imagem_base64, produtos, recompensas, data_inicio, data_fim, ativa } = req.body;
      
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
        imagem_base64,
        produtos,
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
      
      const campanha = await campanhasRepository.buscarPorId(id);
      
      // Verificar permissão
      if (role === 'empresa' && campanha.empresa_id !== usuario_id) {
        return res.status(403).json({ error: 'Você só pode excluir suas próprias campanhas' });
      }
      
      if (role === 'cdl') {
        const empresa = await usuariosRepository.buscarUsuarioPorId(campanha.empresa_id);
        if (empresa.cdl_id !== usuario_id && campanha.empresa_id !== usuario_id) {
          return res.status(403).json({ error: 'Você só pode excluir campanhas suas ou das suas lojas' });
        }
      }
      
      if (role !== 'admin' && role !== 'cdl' && role !== 'empresa') {
        return res.status(403).json({ error: 'Não autorizado' });
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

module.exports = CampanhasController;