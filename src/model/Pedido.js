const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { ProdutoPedido } = require("./ProdutoPedido");
const { Usuario } = require("./Usuarios");  // Para associação com Cliente

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
    cliente_id: {  // Novo campo: Pedido feito por cliente
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: "usuarios", key: "usuario_id" },
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

// Associações
Pedido.belongsTo(ProdutoPedido, { foreignKey: "produto_pedido_id", as: "ProdutoPedido" });
Pedido.belongsTo(Usuario, { foreignKey: "cliente_id", as: "Cliente" });  // Nova: Pedido pertence a Cliente

module.exports = { Pedido };