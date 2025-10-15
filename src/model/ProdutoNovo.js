const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Estado } = require("./Estado");

const ProdutoNovo = sequelize.define(
  "ProdutoNovo",
  {
    produto_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    valor: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    tipo_comercializacao: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    tipo_produto: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    estado_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: Estado,
        key: "estado_id",
      },
    },
    foto_principal: {
      type: Sequelize.STRING,
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
    tableName: "produto_novo",
    timestamps: false,
  }
);

ProdutoNovo.belongsTo(Estado, {
  foreignKey: "estado_id",
  as: "estado",
});

module.exports = { ProdutoNovo };


