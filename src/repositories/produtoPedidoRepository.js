const { ProdutoPedido } = require("../model/ProdutoPedido");

async function listarProdutosPedido(filtros = {}) {
  return ProdutoPedido.findAll({ where: filtros, order: [["nome", "ASC"]] });
}

async function buscarProdutoPedidoPorId(id) {
  const item = await ProdutoPedido.findByPk(id);
  if (!item) throw new Error("ProdutoPedido não encontrado");
  return item;
}

async function criarProdutoPedido(payload) {
  const { nome, valor, foto_principal } = payload;
  if (!nome || valor === undefined) throw new Error("'nome' e 'valor' são obrigatórios");
  return ProdutoPedido.create({ nome, valor, foto_principal });
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


