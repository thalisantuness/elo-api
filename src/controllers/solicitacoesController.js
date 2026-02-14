const repoSolicitacoes = require('../repositories/solicitacoesRepository');
const { Recompensas } = require('../model/Recompensas');

function solicitacoesController() {
  async function listarSolicitacoes(req, res) {
    try {
      const solicitacoes = await repoSolicitacoes.getRequests();
      res.status(200).json(solicitacoes);
    } catch (error) {
      console.error('Erro ao listar solicitações:', error);
      res.status(500).json({ error: 'Não foi possível listar as solicitações no momento.' });
    }
  }

  async function criarSolicitacao(req, res) {
    const { recom_id } = req.body;
    const { usuario_id, role } = req.user;
    if (role !== 'cliente') {
      return res.status(403).json({ error: 'Apenas usuários com a role "cliente" podem criar solicitações.' });
    }
    
    try {
      const solicitacao = await repoSolicitacoes.criarSolicitacao({
        recom_id,
        usuario_id
      });
      res.status(201).json({ message: 'Solicitação criada com sucesso', solicitacao });
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      res.status(500).json({ error: 'Não foi possível criar a solicitação no momento.' });
    }
  }

  async function processarSolicitacao(req, res) {
    const { id } = req.params;
    const { decisao } = req.body;
    const { role, usuario_id } = req.user;
   
    if (role !== 'empresa' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas empresas ou admins podem processar solicitações.' });
    }
 
    try {
      const resultado = await repoSolicitacoes.processarSolicitacao(id, decisao);
      if (resultado.message.includes('não encontrada')) {
        return res.status(404).json({ error: resultado.message });
      }
      
      // Verificação de ownership para empresa
      if (role === 'empresa') {
        const solicitacoes = await repoSolicitacoes.getRequests();
        const solicitacao = solicitacoes.find(s => s.solicitacao_id === parseInt(id));
        if (solicitacao) {
          const recompensa = await Recompensas.findByPk(solicitacao.recom_id);
          if (recompensa && recompensa.usuario_id !== usuario_id) {
            return res.status(403).json({ error: 'Você só pode processar recompensas da sua empresa' });
          }
        }
      }
      res.status(200).json({ message: resultado.message });
    } catch (error) {
      console.error('Erro ao processar solicitação:', error);
      res.status(500).json({ error: 'Erro ao processar a solicitação.' });
    }
  }
 
  return {
    listarSolicitacoes,
    criarSolicitacao,
    processarSolicitacao,
  };
}

module.exports = solicitacoesController;