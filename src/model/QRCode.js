const Sequelize = require('sequelize');
const sequelize = require('../utils/db');
const { Usuario } = require('./Usuarios');
const { Compra } = require('./Compra');

const QRCode = sequelize.define('qrcodes', {
  qr_code_id: {
    type: Sequelize.STRING(100),
    primaryKey: true,
  },
  compra_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: 'compras', key: 'compra_id' },
  },
  empresa_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: 'usuarios', key: 'usuario_id' },
  },
  cliente_id: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'usuarios', key: 'usuario_id' },
  },
  qr_data: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  status: {
    type: Sequelize.ENUM('pendente', 'escaneado', 'validado', 'expirado'),
    defaultValue: 'pendente',
  },
  escaneado_em: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  expira_em: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  data_cadastro: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
}, {
  schema: 'public',
  tableName: 'qrcodes',
  timestamps: false,
});

QRCode.belongsTo(Compra, {
  foreignKey: 'compra_id',
  as: 'compra'
});
QRCode.belongsTo(Usuario, {
  foreignKey: 'empresa_id',
  as: 'empresa'
});
QRCode.belongsTo(Usuario, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});

module.exports = { QRCode };