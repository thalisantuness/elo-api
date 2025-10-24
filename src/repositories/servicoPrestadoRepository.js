const { ServicoPrestado } = require("../model/ServicoPrestado");
const { Usuario } = require("../model/Usuarios");  // Importe o modelo Usuario para validação

async function listarServicos(filtros = {}) {
  return ServicoPrestado.findAll({ 
    where: filtros, 
    include: [{ association: "Empresa", attributes: ["usuario_id", "nome", "email", "role"] }],  // Alias atualizado para "Empresa"
    order: [["nome", "ASC"]] 
  });
}

async function buscarServicoPorId(id) {
  const servico = await ServicoPrestado.findByPk(id, {
    include: [{ association: "Empresa", attributes: ["usuario_id", "nome", "email", "role"] }]  // Alias atualizado
  });
  if (!servico) throw new Error("Serviço não encontrado");
  return servico;
}

async function criarServico(payload) {
  const { nome, valor, foto_principal, empresa_id } = payload;  // Renomeado
  if (!nome || valor === undefined || !empresa_id) {
    throw new Error("'nome', 'valor' e 'empresa_id' são obrigatórios");
  }

  // Validação: Apenas empresa ou admin podem criar
  const empresa = await Usuario.findByPk(empresa_id);
  if (!empresa) {
    throw new Error("Empresa/Usuário não encontrado");
  }
  if (empresa.role !== 'empresa' && empresa.role !== 'admin') {
    throw new Error("Apenas empresas ou admins podem criar serviços");
  }

  return ServicoPrestado.create({ nome, valor, foto_principal, empresa_id });  // Renomeado
}

async function atualizarServico(id, dados) {
  const servico = await buscarServicoPorId(id);

  // Validação adicional: Verificar se o usuário logado é o dono ou admin (opcional, expandir se precisar)
  const empresaAtual = await Usuario.findByPk(servico.empresa_id);
  if (empresaAtual.role !== 'admin' && dados.empresa_id && dados.empresa_id !== servico.empresa_id) {
    throw new Error("Não autorizado a alterar empresa dona do serviço");
  }

  return servico.update(dados);
}

async function deletarServico(id) {
  const servico = await buscarServicoPorId(id);

  // Validação: Apenas dono ou admin pode deletar
  const empresaAtual = await Usuario.findByPk(servico.empresa_id);
  if (empresaAtual.role !== 'admin' && req.user?.empresa_id !== servico.empresa_id) {  // Assuma req.user do middleware de auth
    throw new Error("Não autorizado a deletar este serviço");
  }

  return servico.destroy();
}

module.exports = {
  listarServicos,
  buscarServicoPorId,
  criarServico,
  atualizarServico,
  deletarServico,
};