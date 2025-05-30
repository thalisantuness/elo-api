const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Motorista } = require("./Motorista");

const ReferenciaTransportadora = sequelize.define(
  "ReferenciaTransportadora",
  {
    referenciatransportadora_id: {
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
    tableName: "referencia_transportadora",
    timestamps: false,
  }
);


module.exports = { ReferenciaTransportadora };
