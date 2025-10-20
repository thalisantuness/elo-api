const repo = require("../repositories/pedidoRepository");

function PedidoController() {
  async function listar(req, res) {
    try {
      const { produto_pedido_id, status } = req.query;
      const filtros = {};
      if (produto_pedido_id) filtros.produto_pedido_id = produto_pedido_id;
      if (status) filtros.status = status;
      const itens = await repo.listarPedidos(filtros);
      res.json(itens);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async function criar(req, res) {
    try {
      const item = await repo.criarPedido(req.body);
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
      const item = await repo.atualizarPedido(req.params.id, req.body);
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


