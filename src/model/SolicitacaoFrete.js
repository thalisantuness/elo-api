const Sequelize = require('sequelize');
const { Usuario } = require('./Usuarios'); 
const { Frete } = require('./Frete');
const sequelize = require('../utils/db');

const SolicitacaoFrete = sequelize.define('SolicitacaoFrete', {
  solicitacao_id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  empresa_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'usuario_id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  motorista_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'usuario_id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  frete_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: Frete,
      key: 'frete_id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  status: {
    type: Sequelize.ENUM('pendente', 'aceita', 'rejeitada'),
    allowNull: false,
    defaultValue: 'pendente',
  },
  data_solicitacao: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
  data_resposta: {
    type: Sequelize.DATE,
    allowNull: true,
  },
}, {
  schema: 'public',
  tableName: 'solicitacao_fretes',
  timestamps: false,
});


SolicitacaoFrete.belongsTo(Usuario, {
  foreignKey: 'empresa_id',
  as: 'Empresa', 
});

SolicitacaoFrete.belongsTo(Usuario, {
  foreignKey: 'motorista_id',
  as: 'Motorista', 
});

SolicitacaoFrete.belongsTo(Frete, {
  foreignKey: 'frete_id',
  as: 'Frete', 
});

module.exports = { SolicitacaoFrete };