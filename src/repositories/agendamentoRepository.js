const { Agendamento } = require("../model/Agendamento");

async function listarAgendamentos(filtros = {}) {
  return Agendamento.findAll({
    where: filtros,
    include: [
      { 
        association: "Servico",
        include: [{ association: "Empresa", attributes: ["usuario_id", "nome", "email", "role"] }]
      },
      { association: "Cliente", attributes: ["usuario_id", "nome", "email", "role"] },
    ],
    order: [["dia_marcado", "ASC"]],
  });
}

async function buscarAgendamentoPorId(id) {
  const agendamento = await Agendamento.findByPk(id, {
    include: [
      { 
        association: "Servico",
        include: [{ association: "Empresa", attributes: ["usuario_id", "nome", "email", "role"] }]
      },
      { association: "Cliente", attributes: ["usuario_id", "nome", "email", "role"] }
    ],
  });
  if (!agendamento) throw new Error("Agendamento não encontrado");
  return agendamento;
}

async function criarAgendamento(payload) {
  const { servico_id, cliente_id, dia_marcado, status, observacao } = payload;
  if (!servico_id || !cliente_id || !dia_marcado) {
    throw new Error("'servico_id', 'cliente_id' e 'dia_marcado' são obrigatórios");
  }
  return Agendamento.create({ servico_id, cliente_id, dia_marcado, status: status || "agendado", observacao: observacao || null });
}

async function atualizarAgendamento(id, dados) {
  const agendamento = await buscarAgendamentoPorId(id);
  return agendamento.update(dados);
}

async function cancelarAgendamento(id) {
  const agendamento = await buscarAgendamentoPorId(id);
  return agendamento.update({ status: "cancelado" });
}

async function remarcarAgendamento(id, novaData) {
  const agendamento = await buscarAgendamentoPorId(id);
  return agendamento.update({ dia_marcado: novaData, status: "remarcado" });
}

async function deletarAgendamento(id) {
  const agendamento = await buscarAgendamentoPorId(id);
  return agendamento.destroy();
}

module.exports = {
  listarAgendamentos,
  buscarAgendamentoPorId,
  criarAgendamento,
  atualizarAgendamento,
  cancelarAgendamento,
  remarcarAgendamento,
  deletarAgendamento,
};


