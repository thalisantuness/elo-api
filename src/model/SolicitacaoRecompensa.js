const { Sequelize } = require('sequelize');
// const { Usuario } = require('./Usuarios'); 
// const { Recompensas } = require('./Recompensas');
const sequelize = require('../utils/db');

const SolicitacaoRecompensa = sequelize.define('SolicitacaoRecompensa', {
  solicitacao_id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
//   usuario_id: {
//     type: Sequelize.INTEGER,
//     allowNull: false,
//     references: {
//       model: Usuario,
//       key: 'usuario_id',
//     },
//     onUpdate: 'CASCADE',
//     onDelete: 'CASCADE',
//   },
//   recom_id: {
//     type: Sequelize.INTEGER,
//     allowNull: false,
//     references: {
//       model: Recompensas,
//       key: 'recom_id',
//     },
//     onUpdate: 'CASCADE',
//     onDelete: 'CASCADE',
//   },
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
  tableName: 'solicitacao_recompensas',
  timestamps: false,
});

// SolicitacaoRecompensa.belongsTo(Usuario, {
//   foreignKey: 'usuario_id',
//   as: 'usuario', 
// });

// SolicitacaoRecompensa.belongsTo(Recompensas, {
//   foreignKey: 'recom_id',
//   as: 'recompensa', 
// });

module.exports = { SolicitacaoRecompensa };