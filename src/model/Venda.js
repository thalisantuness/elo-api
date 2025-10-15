const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../utils/db');
const {Produto} = require('./Produto'); 
const {Usuario} = require('./Usuarios');

const Venda = sequelize.define('Venda', {
  venda_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios', // Nome da tabela no banco de dados
      key: 'usuario_id',
    },
  },
  data_venda: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'finalizada',
  },
}, {
  schema: 'public',
  tableName: 'venda',
  timestamps: false,
});

const ItemVenda = sequelize.define('ItemVenda', {
  item_venda_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  venda_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'venda',
      key: 'venda_id',
    },
  },
  produto_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'produto',
      key: 'produto_id',
    },
  },
  quantidade: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  preco_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  schema: 'public',
  tableName: 'item_venda',
  timestamps: false,
});

// Relacionamentos
Venda.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario',
});

Venda.hasMany(ItemVenda, {
  foreignKey: 'venda_id',
  as: 'itens',
});

ItemVenda.belongsTo(Produto, {
  foreignKey: 'produto_id',
  as: 'produto',
});

module.exports = { Venda, ItemVenda };