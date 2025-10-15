const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../utils/db');

const Produto = sequelize.define('Produto', {
  produto_id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome: {
    type: Sequelize.STRING,
    allowNull: false,
    field: 'nome_do_produto' 
  },
  preco: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
  },
  preco_venda: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
  },
  quantidade: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  data_vencimento: {
    type: Sequelize.DATEONLY,
    allowNull: true, // Dependendo se é obrigatório ou não
  }
}, {
  schema: 'public',
  tableName: 'produto',
  timestamps: false,
});

module.exports = { Produto };