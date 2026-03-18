const { Sequelize, DataTypes } = require("sequelize"); // <-- ADICIONE DataTypes AQUI
const sequelize = require("../utils/db");
const { Regra } = require("./Regra");

const Usuario = sequelize.define(
  "Usuario",
  {
    usuario_id: {
      type: DataTypes.INTEGER, // <-- Agora funciona
      primaryKey: true,
      autoIncrement: true,
    },
    cdl_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "usuarios",
        key: "usuario_id",
      },
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["admin", "cdl", "empresa", "cliente", "empresa-funcionario"]],
      },
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telefone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    senha: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    foto_perfil: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cliente_endereco: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cidade: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    estado: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    pontos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    cnpj: {
      type: DataTypes.STRING(18),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("ativo", "pendente", "bloqueado"),
      defaultValue: "pendente",
    },
    regra_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "regras", key: "regra_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    modalidade_pontuacao: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "regras",
    },
    data_cadastro: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    data_atualizacao: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    
    // ========== NOVOS CAMPOS (APENAS UMA VEZ) ==========
    mp_customer_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "ID do cliente no Mercado Pago",
    },
    plano_atual: {
      type: DataTypes.ENUM("gratuito", "basico", "profissional", "enterprise"),
      defaultValue: "gratuito",
    },
    status_assinatura: {
      type: DataTypes.ENUM("ativa", "inadimplente", "pendente", "cancelada"),
      defaultValue: "gratuito",
    },
    limite_produtos: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    limite_usuarios: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    data_expiracao_plano: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ultimo_pagamento: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    proximo_pagamento: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    schema: "public",
    tableName: "usuarios",
    timestamps: false,
    indexes: [
      { fields: ["regra_id"] },
      { fields: ["cdl_id"] },
      { fields: ["role"] },
      { fields: ["cidade", "estado"] },
    ],
  }
);

Usuario.belongsTo(Regra, {
  foreignKey: "regra_id",
  as: "regra",
});

// Auto-relacionamento para CDL -> Lojas/Clientes
Usuario.belongsTo(Usuario, {
  foreignKey: "cdl_id",
  as: "cdl",
});

Usuario.hasMany(Usuario, {
  foreignKey: "cdl_id",
  as: "membros",
});

module.exports = { Usuario };