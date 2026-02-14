const Sequelize = require('sequelize');
const sequelize = require('../utils/db');
const { Usuario } = require('./Usuarios');
const { Campanha } = require('./Campanha');

const Compra = sequelize.define('compras', {
  compra_id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  qr_code_id: {
    type: Sequelize.STRING(100),
    allowNull: false,
    unique: true,
  },
  cliente_id: { 
    type: Sequelize.INTEGER,
    allowNull: true,  
    defaultValue: null,  
    references: { model: 'usuarios', key: 'usuario_id' },
  },
  empresa_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: 'usuarios', key: 'usuario_id' },
  },
  campanha_id: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'campanhas', key: 'campanha_id' },
  },
  valor: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
  },
  pontos_adquiridos: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: Sequelize.ENUM('pendente', 'validada', 'cancelada', 'expirada'),
    defaultValue: 'pendente',
  },
  qr_code_data: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  qr_code_expira_em: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  validado_por: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'usuarios', key: 'usuario_id' },
  },
  validado_em: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  data_cadastro: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
  data_update: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
}, {
  schema: 'public',
  tableName: 'compras',
  timestamps: false,
});

Compra.belongsTo(Usuario, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});
Compra.belongsTo(Usuario, {
  foreignKey: 'empresa_id',
  as: 'empresa'
});
Compra.belongsTo(Usuario, {
  foreignKey: 'validado_por',
  as: 'validador'
});
Compra.belongsTo(Campanha, {
  foreignKey: 'campanha_id',
  as: 'campanha'
});

module.exports = { Compra };