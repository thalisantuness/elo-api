const { Pedido } = require("../model/Pedido");
const { Usuario } = require("../model/Usuarios");  // Para validação de cliente

async function listarPedidos(filtros = {}) {
  return Pedido.findAll({
    where: filtros,
    include: [
      { association: "Cliente", attributes: ["usuario_id", "nome", "email", "role"] },  // Novo: Incluir Cliente
      { 
        association: "ProdutoPedido", 
        include: [{ association: "Empresa", attributes: ["usuario_id", "nome", "email", "role"] }]  // Atualizado: Nested Empresa
      }
    ],
    order: [["data_hora_entrega", "ASC"]],
  });
}

async function buscarPedidoPorId(id) {
  const pedido = await Pedido.findByPk(id, { 
    include: [
      { association: "Cliente", attributes: ["usuario_id", "nome", "email", "role"] },  // Novo
      { 
        association: "ProdutoPedido", 
        include: [{ association: "Empresa", attributes: ["usuario_id", "nome", "email", "role"] }]  // Atualizado
      }
    ] 
  });
  if (!pedido) throw new Error("Pedido não encontrado");
  return pedido;
}

async function criarPedido(payload) {
  const { produto_pedido_id, cliente_id, data_hora_entrega, status, observacao } = payload;  // Adicionado cliente_id
  if (!produto_pedido_id || !cliente_id || !data_hora_entrega) {  // Validação cliente_id
    throw new Error("'produto_pedido_id', 'cliente_id' e 'data_hora_entrega' são obrigatórios");
  }

  // Validação: Checar se cliente existe (opcional: role 'cliente')
  const cliente = await Usuario.findByPk(cliente_id);
  if (!cliente) {
    throw new Error("Cliente não encontrado");
  }
  // Exemplo: if (cliente.role !== 'cliente') { throw new Error("Usuário deve ser cliente"); }

  return Pedido.create({ 
    produto_pedido_id, 
    cliente_id,  // Adicionado
    data_hora_entrega, 
    status: status || "pendente", 
    observacao: observacao || null 
  });
}

async function atualizarPedido(id, dados) {
  const pedido = await buscarPedidoPorId(id);

  // Validação adicional: Se alterando cliente, checar permissão (ex: admin)
  if (dados.cliente_id && dados.cliente_id !== pedido.cliente_id) {
    // Exemplo: throw new Error("Não autorizado a alterar cliente do pedido");
  }

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