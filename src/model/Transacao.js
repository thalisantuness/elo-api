const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');
const { Usuario } = require('./Usuarios');
const { Assinatura } = require('./Assinatura');

const Transacao = sequelize.define('Transacao', {
  transacao_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'usuario_id',
    },
  },
  assinatura_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'assinaturas',
      key: 'assinatura_id',
    },
  },
  codigo_transacao: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pendente', 'aprovada', 'expirada', 'recusada'),
    defaultValue: 'pendente',
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  dados_pagamento: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  data_expiracao: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  data_confirmacao: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  mp_payment_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  mp_qr_code: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  mp_qr_code_base64: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'transacoes',
  schema: 'public',
  timestamps: true,
  underscored: true,
});

Transacao.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'empresa',
});

Transacao.belongsTo(Assinatura, {
  foreignKey: 'assinatura_id',
  as: 'assinatura',
});

module.exports = { Transacao };