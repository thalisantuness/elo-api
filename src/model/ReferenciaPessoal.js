const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Motorista } = require("./Motorista");

const ReferenciaPessoal = sequelize.define(
  "ReferenciaPessoal",
  {
    referencia_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    motorista_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: Motorista,
        key: "motorista_id",
      },
    },
    nome: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    telefone_fixo: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    schema: "public",
    tableName: "referencia_pessoal",
    timestamps: false,
  }
);

module.exports = { ReferenciaPessoal };
