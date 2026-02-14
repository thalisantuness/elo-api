const { Sequelize } = require('sequelize');
const sequelize = require('../utils/db');
const { Usuario } = require('./Usuarios');

const Campanha = sequelize.define('campanhas', {
  campanha_id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
//   empresa_id: {
//     type: Sequelize.INTEGER,
//     allowNull: false,
//     references: { model: 'usuarios', key: 'usuario_id' },
//   },
  titulo: {
    type: Sequelize.STRING(100),
    allowNull: false,
    validate: { notEmpty: true },
  },
  descricao: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  imagem_url: {
    type: Sequelize.STRING(255),
    allowNull: true,
  },
  recompensas: {
    type: Sequelize.ARRAY(Sequelize.INTEGER),
    allowNull: true,
    defaultValue: [],
  },
  data_inicio: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  data_fim: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  ativa: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
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
  tableName: 'campanhas',
  timestamps: false,
//   indexes: [
//     { fields: ['empresa_id'] },
//     { fields: ['ativa', 'data_inicio', 'data_fim'] },
//   ]
});

Campanha.belongsTo(Usuario, { foreignKey: 'empresa_id', as: 'empresa' });

module.exports = { Campanha };