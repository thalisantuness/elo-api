const { SolicitacaoFrete } = require("../model/SolicitacaoFrete");
const { Sequelize } = require("sequelize");

async function criarSolicitacao(solicitacaoData) {
  return await SolicitacaoFrete.create(solicitacaoData);
}

async function buscarSolicitacaoPorId(solicitacao_id) {
  return await SolicitacaoFrete.findByPk(solicitacao_id, {
    include: [
      {
        association: "Empresa",
        attributes: ["usuario_id", "nome_completo", "imagem_perfil"]
      },
      {
        association: "Motorista",
        attributes: ["usuario_id", "nome_completo", "imagem_perfil"]
      },
      {
        association: "Frete"
      }
    ]
  });
}

async function listarSolicitacoesPorEmpresa(empresa_id) {
  return await SolicitacaoFrete.findAll({
    where: { empresa_id },
    include: [
      {
        association: "Motorista",
        attributes: ["usuario_id", "nome_completo", "imagem_perfil"]
      },
      {
        association: "Frete",
        include: [{
          association: "Empresa",
          attributes: ["usuario_id", "nome_completo"]
        }]
      }
    ],
    order: [['data_solicitacao', 'DESC']]
  });
}

async function listarSolicitacoesPorMotorista(motorista_id) {
  return await SolicitacaoFrete.findAll({
    where: { motorista_id },
    include: [
      {
        association: "Empresa",
        attributes: ["usuario_id", "nome_completo", "imagem_perfil"]
      },
      {
        association: "Frete",
        include: [{
          association: "Empresa",
          attributes: ["usuario_id", "nome_completo"]
        }]
      }
    ],
    order: [['data_solicitacao', 'DESC']]
  });
}

async function atualizarSolicitacao(solicitacao_id, dadosAtualizacao) {
  return await SolicitacaoFrete.update(dadosAtualizacao, {
    where: { solicitacao_id },
    returning: true
  });
}

async function verificarSolicitacaoExistente(frete_id, motorista_id) {
  return await SolicitacaoFrete.findOne({
    where: { frete_id, motorista_id }
  });
}

async function rejeitarOutrasSolicitacoes(frete_id, solicitacao_id_excluir) {
  return await SolicitacaoFrete.update(
    { status: "rejeitada", data_resposta: new Date() },
    {
      where: {
        frete_id,
        solicitacao_id: { [Sequelize.Op.ne]: solicitacao_id_excluir },
        status: "pendente"
      }
    }
  );
}

module.exports = {
  criarSolicitacao,
  buscarSolicitacaoPorId,
  listarSolicitacoesPorEmpresa,
  listarSolicitacoesPorMotorista,
  atualizarSolicitacao,
  verificarSolicitacaoExistente,
  rejeitarOutrasSolicitacoes
};