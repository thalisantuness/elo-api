const { Pedido } = require("../model/Pedido");

async function listarPedidos(filtros = {}) {
  return Pedido.findAll({
    where: filtros,
    include: [{ association: "ProdutoPedido" }],
    order: [["data_hora_entrega", "ASC"]],
  });
}

async function buscarPedidoPorId(id) {
  const pedido = await Pedido.findByPk(id, { include: [{ association: "ProdutoPedido" }] });
  if (!pedido) throw new Error("Pedido não encontrado");
  return pedido;
}

async function criarPedido(payload) {
  const { produto_pedido_id, data_hora_entrega, status, observacao } = payload;
  if (!produto_pedido_id || !data_hora_entrega) throw new Error("Campos obrigatórios faltando");
  return Pedido.create({ produto_pedido_id, data_hora_entrega, status: status || "pendente", observacao: observacao || null });
}

async function atualizarPedido(id, dados) {
  const pedido = await buscarPedidoPorId(id);
  return pedido.update(dados);
}

async function cancelarPedido(id) {
  const pedido = await buscarPedidoPorId(id);
  return pedido.update({ status: "cancelado" });
}

async function deletarPedido(id) {
  const pedido = await buscarPedidoPorId(id);
  return pedido.destroy();
}

module.exports = {
  listarPedidos,
  buscarPedidoPorId,
  criarPedido,
  atualizarPedido,
  cancelarPedido,
  deletarPedido,
};


