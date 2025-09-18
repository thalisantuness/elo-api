const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Usuario } = require("./Usuarios");
const { Frete } = require("./Frete");

const Conversa = sequelize.define(
  "Conversa",
  {
    conversa_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario1_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "usuario_id",
      },
    },
    frete_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "fretes",
        key: "frete_id",
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE', // Adiciona exclusão em cascata
    },
    usuario2_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "usuario_id",
      },
    },
    ultima_mensagem: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  },
  {
    schema: "public",
    tableName: "conversas",
    timestamps: false,
  }
);

Conversa.belongsTo(Usuario, { foreignKey: "usuario1_id", as: "Usuario1" });
Conversa.belongsTo(Usuario, { foreignKey: "usuario2_id", as: "Usuario2" });
Conversa.belongsTo(Frete, { foreignKey: "frete_id", as: "Frete" });

module.exports = { Conversa };