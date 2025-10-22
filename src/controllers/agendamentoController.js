const repo = require("../repositories/agendamentoRepository");

function AgendamentoController() {
  async function listar(req, res) {
    try {
      const { servico_id, usuario_id, status } = req.query;
      const filtros = {};
      if (servico_id) filtros.servico_id = servico_id;
      if (usuario_id) filtros.usuario_id = usuario_id;
      if (status) filtros.status = status;
      const itens = await repo.listarAgendamentos(filtros);
      res.json(itens);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async function criar(req, res) {
    try {
      const item = await repo.criarAgendamento(req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async function buscarPorId(req, res) {
    try {
      const item = await repo.buscarAgendamentoPorId(req.params.id);
      res.json(item);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async function atualizar(req, res) {
    try {
      const item = await repo.atualizarAgendamento(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async function cancelar(req, res) {
    try {
      const item = await repo.cancelarAgendamento(req.params.id);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async function remarcar(req, res) {
    try {
      const item = await repo.remarcarAgendamento(req.params.id, req.body.nova_data);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async function excluir(req, res) {
    try {
      await repo.deletarAgendamento(req.params.id);
      res.json({ message: "Agendamento excluído com sucesso" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  return { listar, criar, buscarPorId, atualizar, cancelar, remarcar, excluir };
}

module.exports = AgendamentoController;


