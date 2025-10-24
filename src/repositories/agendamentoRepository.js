const { Agendamento } = require("../model/Agendamento");
const { Usuario } = require("../model/Usuarios");  // Para validação

async function listarAgendamentos(filtros = {}) {
  return Agendamento.findAll({
    where: filtros,
    include: [
      { 
        association: "Servico",
        include: [{ association: "Empresa", attributes: ["usuario_id", "nome", "email", "role"] }]  // Atualizado para "Empresa"
      },
      { association: "Cliente", attributes: ["usuario_id", "nome", "email", "role"] },  // Atualizado para "Cliente"
    ],
    order: [["dia_marcado", "ASC"]],
  });
}

async function buscarAgendamentoPorId(id) {
  const agendamento = await Agendamento.findByPk(id, {
    include: [
      { 
        association: "Servico",
        include: [{ association: "Empresa", attributes: ["usuario_id", "nome", "email", "role"] }]  // Atualizado
      },
      { association: "Cliente", attributes: ["usuario_id", "nome", "email", "role"] }  // Atualizado
    ],
  });
  if (!agendamento) throw new Error("Agendamento não encontrado");
  return agendamento;
}

async function criarAgendamento(payload) {
  const { servico_id, cliente_id, dia_marcado, status, observacao } = payload;  // Renomeado
  if (!servico_id || !cliente_id || !dia_marcado) {  // Renomeado
    throw new Error("'servico_id', 'cliente_id' e 'dia_marcado' são obrigatórios");  // Renomeado
  }

  // Validação: Checar se cliente existe (opcional: adicione checagem de role 'cliente' se aplicável)
  const cliente = await Usuario.findByPk(cliente_id);
  if (!cliente) {
    throw new Error("Cliente não encontrado");
  }
  // Exemplo: if (cliente.role !== 'cliente') { throw new Error("Usuário deve ser cliente"); }

  return Agendamento.create({ 
    servico_id, 
    cliente_id,  // Renomeado
    dia_marcado, 
    status: status || "agendado", 
    observacao: observacao || null 
  });
}

async function atualizarAgendamento(id, dados) {
  const agendamento = await buscarAgendamentoPorId(id);

  // Validação adicional: Se alterando cliente, checar permissão (ex: admin ou dono)
  if (dados.cliente_id && dados.cliente_id !== agendamento.cliente_id) {
    const clienteAtual = await Usuario.findByPk(agendamento.cliente_id);
    // Exemplo: if (clienteAtual.role !== 'admin') { throw new Error("Não autorizado"); }
  }

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