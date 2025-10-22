const { ServicoPrestado } = require("../model/ServicoPrestado");

async function listarServicos(filtros = {}) {
  return ServicoPrestado.findAll({ 
    where: filtros, 
    include: [{ association: "Usuario", attributes: ["usuario_id", "nome", "email", "role"] }],
    order: [["nome", "ASC"]] 
  });
}

async function buscarServicoPorId(id) {
  const servico = await ServicoPrestado.findByPk(id, {
    include: [{ association: "Usuario", attributes: ["usuario_id", "nome", "email", "role"] }]
  });
  if (!servico) throw new Error("Serviço não encontrado");
  return servico;
}

async function criarServico(payload) {
  const { nome, valor, foto_principal, usuario_id } = payload;
  if (!nome || valor === undefined || !usuario_id) {
    throw new Error("'nome', 'valor' e 'usuario_id' são obrigatórios");
  }
  return ServicoPrestado.create({ nome, valor, foto_principal, usuario_id });
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


