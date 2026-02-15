const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Usuario } = require("./Usuarios");

const Recompensas = sequelize.define('recompensas', {
  recom_id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'O campo "nome" não pode estar vazio.',
      },
      notNull: {
        msg: 'O campo "nome" é obrigatório.',
      },
    },
  },
  descricao: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  imagem_url: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  pontos: {
    type: Sequelize.INTEGER,
    allowNull: true, 
  },
  estoque: {
    type: Sequelize.INTEGER,
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
  usuario_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: 'usuarios', key: 'usuario_id' },
  }
}, {
  schema: 'public',
  tableName: 'recompensas',
  timestamps: false
});

// Associação com Usuário (dono da recompensa)
Recompensas.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

module.exports = { Recompensas };