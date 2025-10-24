const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Usuario } = require("./Usuarios");

const ServicoPrestado = sequelize.define(
  "ServicoPrestado",
  {
    servico_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {  // Renomeado de usuario_id
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
    tableName: "servicos_prestados",
    timestamps: false,
  }
);

// Associação atualizada: foreignKey agora é empresa_id, alias "Empresa" para clareza
ServicoPrestado.belongsTo(Usuario, { foreignKey: "empresa_id", as: "Empresa" });

module.exports = { ServicoPrestado };