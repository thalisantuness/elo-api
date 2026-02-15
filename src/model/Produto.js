const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Usuario } = require("./Usuarios");

const Produto = sequelize.define(
  "Produto",
  {
    produto_id: {
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
    nome: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    valor: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    valor_custo: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    quantidade: {
      type: Sequelize.INTEGER,
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
    empresas_autorizadas: {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
      defaultValue: [],
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
    tableName: "produtos",
    timestamps: false,
  }
);

Produto.belongsTo(Usuario, { foreignKey: "empresa_id", as: "Empresa" });

module.exports = { Produto };