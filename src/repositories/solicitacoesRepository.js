const { SolicitacaoRecompensa } = require('../model/SolicitacaoRecompensa');
const { Usuario } = require('../model/Usuarios');
const { Recompensas } = require('../model/Recompensas');

async function getRequests() {
  return SolicitacaoRecompensa.findAll({
    include: [
      { model: Usuario, as: 'usuario', attributes: ['nome', 'email', 'pontos'] },
      { model: Recompensas, as: 'recompensa', attributes: ['nome', 'pontos', 'estoque'] }
    ],
    order: [['data_solicitacao', 'DESC']]
  });
}

async function listarSolicitacoesPorUsuario(usuario_id) {
  return SolicitacaoRecompensa.findAll({ 
    where: { usuario_id },
    include: [
      { model: Recompensas, as: 'recompensa', attributes: ['nome', 'pontos'] }
    ]
  });
}

async function criarSolicitacao(dadosSolicitacao) {
  const { recom_id, usuario_id } = dadosSolicitacao;
  if (!recom_id) {
    throw new Error('O id da recompensa é obrigatório');
  }
  return SolicitacaoRecompensa.create({
    usuario_id,
    recom_id,
    status: 'pendente',
    data_solicitacao: new Date(),
  });
}

async function processarSolicitacao(solicitacao_id, decisao) {
  const solicitacao = await SolicitacaoRecompensa.findByPk(solicitacao_id);
  if (!solicitacao) return { message: 'Solicitação não encontrada.' };
  if (solicitacao.status !== 'pendente') return { message: 'Essa solicitação já foi processada.' };
  
  const usuario = await Usuario.findByPk(solicitacao.usuario_id);
  const recompensa = await Recompensas.findByPk(solicitacao.recom_id);
  
  if (decisao === 'aceita') {
    if (usuario.pontos < recompensa.pontos) return { message: 'Pontos insuficientes.' };
    if (recompensa.estoque <= 0) return { message: 'Recompensa fora de estoque.' };
    
    solicitacao.status = 'aceita';
    solicitacao.data_resposta = new Date();
    await solicitacao.save();
    
    usuario.pontos -= recompensa.pontos;
    await usuario.save();
    
    recompensa.estoque -= 1;
    await recompensa.save();
    
    return { message: 'Solicitação aceita com sucesso.' };
  } else if (decisao === 'rejeitada') {
    solicitacao.status = 'rejeitada';
    solicitacao.data_resposta = new Date();
    await solicitacao.save();
    return { message: 'Solicitação rejeitada.' };
  }
  return { message: 'Decisão inválida.' };
}

async function verSolicitacoesPendentes() {
  return SolicitacaoRecompensa.findAll({
    where: { status: 'pendente' },
    include: [
      { model: Usuario, as: 'usuario', attributes: ['nome'] },
      { model: Recompensas, as: 'recompensa', attributes: ['nome'] }
    ]
  });
}

module.exports = {
  getRequests,
  criarSolicitacao,
  processarSolicitacao,
  verSolicitacoesPendentes,
  listarSolicitacoesPorUsuario,
};