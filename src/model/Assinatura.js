const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');
const { Usuario } = require('./Usuarios');

const Assinatura = sequelize.define('Assinatura', {
  assinatura_id: {
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
  plano: {
    type: DataTypes.ENUM('mensal', 'trimestral', 'semestral', 'anual'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('ativa', 'cancelada', 'expirada', 'pendente_pagamento'),
    defaultValue: 'pendente_pagamento',
  },
  data_inicio: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  data_fim: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  data_cancelamento: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
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
  mp_expiration_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  tableName: 'assinaturas',
  schema: 'public',
  timestamps: true,
  underscored: true,
});

Assinatura.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'empresa',
});

Usuario.hasMany(Assinatura, {
  foreignKey: 'usuario_id',
  as: 'assinaturas',
});

module.exports = { Assinatura };