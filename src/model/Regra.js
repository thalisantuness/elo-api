const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");

const Regra = sequelize.define('regras', {
  regra_id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  empresa_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: 'usuarios', key: 'usuario_id' },
    unique: true,  
  },
  nome: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  tipo: {
    type: Sequelize.ENUM('por_compra', 'por_valor'),
    allowNull: false,
  },
  valor_minimo: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  pontos: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  multiplicador: {
    type: Sequelize.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 1.0,
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
  tableName: 'regras',
  timestamps: false,
  indexes: [  
    { unique: true, fields: ['empresa_id'] }
  ]
});

module.exports = { Regra };