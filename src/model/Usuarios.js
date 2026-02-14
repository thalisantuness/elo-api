const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Regra } = require("./Regra");

const Usuario = sequelize.define(
  "Usuario",
  {
    usuario_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    //     empresa_pai_id: {
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    //   references: {
    //     model: "usuarios",
    //     key: "usuario_id",
    //   },
    // },
    role: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    nome: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    telefone: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    senha: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    foto_perfil: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    cliente_endereco: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    pontos: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    cnpj: {
      type: Sequelize.STRING(18),
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM("ativo", "pendente", "bloqueado"),
      defaultValue: "pendente",
    },
    // regra_id: {
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    //   references: { model: 'regras', key: 'regra_id' },
    //   onUpdate: 'CASCADE',
    //   onDelete: 'SET NULL',
    // },
    modalidade_pontuacao: {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: "regras",
    },
    data_cadastro: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    data_atualizacao: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  },
  {
    schema: "public",
    tableName: "usuarios",
    timestamps: false,
    // indexes: [
    //   { fields: ['regra_id'] }
    // ]
  },
);

// Usuario.belongsTo(Regra, {
//   foreignKey: 'regra_id',
//   as: 'regra'
// });

module.exports = { Usuario };
