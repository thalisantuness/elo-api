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

async function listarFretes(usuario_id, role, filtros = {}) {
  const whereClause = { ...filtros }; 

  if (role === 'motorista') {
    whereClause.status = 'anunciado';
    whereClause.empresa_id = { [Sequelize.Op.ne]: usuario_id };
  } else { 
    whereClause[Sequelize.Op.or] = [
      { empresa_id: usuario_id },
      { motorista_id: usuario_id }
    ];
  }

  return await Frete.findAll({
    where: whereClause,
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

async function deletarFrete(frete_id, options = {}) {
  const frete = await Frete.findByPk(frete_id, options);
  if (!frete) {
    return 0;
  }
  await frete.destroy(options);
  return 1;
}

module.exports = {
  criarFrete,
  buscarFretePorId,
  listarFretes, 
  atualizarFrete,
  deletarFrete
};