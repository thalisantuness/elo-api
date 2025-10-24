const { ProdutoPedido } = require("../model/ProdutoPedido");
const { Usuario } = require("../model/Usuarios");  // Para validação

async function listarProdutosPedido(filtros = {}) {
  return ProdutoPedido.findAll({ 
    where: filtros, 
    include: [{ association: "Empresa", attributes: ["usuario_id", "nome", "email", "role"] }],  // Incluir Empresa
    order: [["nome", "ASC"]] 
  });
}

async function buscarProdutoPedidoPorId(id) {
  const item = await ProdutoPedido.findByPk(id, {
    include: [{ association: "Empresa", attributes: ["usuario_id", "nome", "email", "role"] }]  // Incluir Empresa
  });
  if (!item) throw new Error("ProdutoPedido não encontrado");
  return item;
}

async function criarProdutoPedido(payload) {
  const { nome, valor, foto_principal, empresa_id } = payload;  // Adicionado empresa_id
  if (!nome || valor === undefined || !empresa_id) {  // Validação empresa_id
    throw new Error("'nome', 'valor' e 'empresa_id' são obrigatórios");
  }

  // Validação: Apenas empresa ou admin podem criar
  const empresa = await Usuario.findByPk(empresa_id);
  if (!empresa) {
    throw new Error("Empresa não encontrada");
  }
  if (empresa.role !== 'empresa' && empresa.role !== 'admin') {
    throw new Error("Apenas empresas ou admins podem criar produtos");
  }

  return ProdutoPedido.create({ nome, valor, foto_principal, empresa_id });
}

async function atualizarProdutoPedido(id, dados) {
  const item = await buscarProdutoPedidoPorId(id);
  return item.update(dados);
}

async function deletarProdutoPedido(id) {
  const item = await buscarProdutoPedidoPorId(id);
  return item.destroy();
}

module.exports = {
  listarProdutosPedido,
  buscarProdutoPedidoPorId,
  criarProdutoPedido,
  atualizarProdutoPedido,
  deletarProdutoPedido,
};