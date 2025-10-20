const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { ProdutoPedido } = require("./ProdutoPedido");

const Pedido = sequelize.define(
  "Pedido",
  {
    pedido_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    produto_pedido_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: "produtos_pedidos", key: "produto_pedido_id" },
    },
    data_hora_entrega: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM("pendente", "confirmado", "em_transporte", "entregue", "cancelado"),
      allowNull: false,
      defaultValue: "pendente",
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
    tableName: "pedidos",
    timestamps: false,
  }
);

Pedido.belongsTo(ProdutoPedido, { foreignKey: "produto_pedido_id", as: "ProdutoPedido" });

module.exports = { Pedido };


