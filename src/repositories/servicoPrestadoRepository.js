const { ServicoPrestado } = require("../model/ServicoPrestado");

async function listarServicos(filtros = {}) {
  return ServicoPrestado.findAll({ where: filtros, order: [["nome", "ASC"]] });
}

async function buscarServicoPorId(id) {
  const servico = await ServicoPrestado.findByPk(id);
  if (!servico) throw new Error("Serviço não encontrado");
  return servico;
}

async function criarServico(payload) {
  const { nome, valor, foto_principal } = payload;
  if (!nome || valor === undefined) throw new Error("'nome' e 'valor' são obrigatórios");
  return ServicoPrestado.create({ nome, valor, foto_principal });
}

async function atualizarServico(id, dados) {
  const servico = await buscarServicoPorId(id);
  return servico.update(dados);
}

async function deletarServico(id) {
  const servico = await buscarServicoPorId(id);
  return servico.destroy();
}

module.exports = {
  listarServicos,
  buscarServicoPorId,
  criarServico,
  atualizarServico,
  deletarServico,
};


