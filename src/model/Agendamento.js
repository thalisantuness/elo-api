const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { ServicoPrestado } = require("./ServicoPrestado");
const { Usuario } = require("./Usuarios");

const Agendamento = sequelize.define(
  "Agendamento",
  {
    agendamento_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    servico_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: "servicos_prestados", key: "servico_id" },
    },
    cliente_id: {  // Renomeado de usuario_id
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: "usuarios", key: "usuario_id" },
    },
    dia_marcado: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM("agendado", "confirmado", "cancelado", "realizado", "remarcado"),
      allowNull: false,
      defaultValue: "agendado",
    },
    observacao: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    data_cadastro: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    data_update: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  },
  {
    schema: "public",
    tableName: "agendamentos",
    timestamps: false,
  }
);

// Associações atualizadas: foreignKey para cliente_id, alias "Cliente"
Agendamento.belongsTo(ServicoPrestado, { foreignKey: "servico_id", as: "Servico" });
Agendamento.belongsTo(Usuario, { foreignKey: "cliente_id", as: "Cliente" });  // Renomeado

module.exports = { Agendamento }; 