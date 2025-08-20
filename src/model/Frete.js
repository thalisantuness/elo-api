const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Usuario } = require("./Usuarios");

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
      allowNull: true,
      references: {
        model: "usuarios",
        key: "usuario_id",
      },
    },
    data_criacao: {
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
        "em_andamento", 
        "finalizado",
        "cancelado"
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