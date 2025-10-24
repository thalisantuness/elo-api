const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Usuario } = require("./Usuarios");  // Import para associação

const ProdutoPedido = sequelize.define(
  "ProdutoPedido",
  {
    produto_pedido_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {  // Novo campo: Produto cadastrado por empresa/admin
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: "usuarios", key: "usuario_id" },
    },
    nome: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    valor: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    foto_principal: {
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
    tableName: "produtos_pedidos",
    timestamps: false,
  }
);

// Associação: ProdutoPedido pertence a Empresa
ProdutoPedido.belongsTo(Usuario, { foreignKey: "empresa_id", as: "Empresa" });

module.exports = { ProdutoPedido };