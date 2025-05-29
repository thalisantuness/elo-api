const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME, 
  process.env.PGUSER, 
  process.env.PGPASSWORD, 
  {
  host: process.env.PGHOST,
  port: 5432,
  dialect: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
  })
  .catch((error) => {
    console.error('Erro ao conectar com o banco de dados:', error);
  });

module.exports = sequelize;
