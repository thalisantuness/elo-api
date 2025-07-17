const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Usuario } = require("../model/Usuarios");

const Frete = sequelize.define(
  "Frete",
  {
    frete_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "usuario_id",
      },
    },
    motorista_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "usuario_id",
      },
    },
    data_solicitacao: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    data_prevista_entrega: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM(
        "anunciado",
        "solicitado",
        "em_andamento",
        "finalizado"
      ),
      defaultValue: "anunciado",
    },
  },
  {
    schema: "public",
    tableName: "fretes",
    timestamps: false,
  }
);

Frete.belongsTo(Usuario, { foreignKey: "empresa_id", as: "Empresa" });
Frete.belongsTo(Usuario, { foreignKey: "motorista_id", as: "Motorista" });

module.exports = { Frete };
