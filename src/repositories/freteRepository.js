// repositories/freteRepository.js
const { Frete } = require("../model/Frete");
const { Sequelize } = require("sequelize");

async function criarFrete(freteData) {
  return await Frete.create(freteData);
}
async function buscarFretePorId(frete_id) {

  const frete = await Frete.findByPk(frete_id, {
    include: [
      {
        association: "Empresa",
        attributes: ["usuario_id", "nome_completo", "imagem_perfil"]
      },
      {
        association: "Motorista", 
        attributes: ["usuario_id", "nome_completo", "imagem_perfil"]
      }
    ]
  });
 
  return frete;
}

async function listarFretesPorUsuario(usuario_id) {
  return await Frete.findAll({
    where: {
      [Sequelize.Op.or]: [
        { empresa_id: usuario_id },
        { motorista_id: usuario_id }
      ]
    },
    include: [
      {
        association: "Empresa",
        attributes: ["usuario_id", "nome_completo", "imagem_perfil"]
      },
      {
        association: "Motorista",
        attributes: ["usuario_id", "nome_completo", "imagem_perfil"]
      }
    ],
    order: [['data_criacao', 'DESC']]
  });
}

async function atualizarFrete(frete_id, dadosAtualizacao) {
  return await Frete.update(dadosAtualizacao, {
    where: { frete_id },
    returning: true
  });
}

module.exports = {
  criarFrete,
  buscarFretePorId,
  listarFretesPorUsuario,
  atualizarFrete
};