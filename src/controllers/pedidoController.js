const repo = require("../repositories/pedidoRepository");

function PedidoController() {
  async function listar(req, res) {
    try {
      const { produto_pedido_id, cliente_id, status } = req.query;  // Adicionado cliente_id
      const filtros = {};
      if (produto_pedido_id) filtros.produto_pedido_id = produto_pedido_id;
      if (cliente_id) filtros.cliente_id = cliente_id;  // Novo filtro
      if (status) filtros.status = status;
      const itens = await repo.listarPedidos(filtros);
      res.json(itens);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async function criar(req, res) {
    try {
      const { produto_pedido_id, cliente_id, data_hora_entrega, status, observacao } = req.body;  // Adicionado cliente_id
      const payload = { produto_pedido_id, cliente_id, data_hora_entrega, status, observacao };  // Incluído no payload
      const item = await repo.criarPedido(payload);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async function buscarPorId(req, res) {
    try {
      const item = await repo.buscarPedidoPorId(req.params.id);
      res.json(item);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async function atualizar(req, res) {
    try {
      const dados = req.body;
      // Opcional: Se alterando cliente_id, valide auth (ex: req.user)
      const item = await repo.atualizarPedido(req.params.id, dados);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async function cancelar(req, res) {
    try {
      const item = await repo.cancelarPedido(req.params.id);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async function excluir(req, res) {
    try {
      await repo.deletarPedido(req.params.id);
      res.json({ message: "Pedido excluído com sucesso" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  return { listar, criar, buscarPorId, atualizar, cancelar, excluir };
}

module.exports = PedidoController;