const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize({
  database: process.env.PGDATABASE || "railway",
  username: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD, // Obrigatório
  host: process.env.PGHOST || "postgres.railway.internal",
  port: process.env.PGPORT || 5432,
  dialect: "postgres", // Agora explícito e obrigatório
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: console.log,
});

sequelize
  .authenticate()
  .then(() => {
    console.log("Conexão com o banco de dados estabelecida com sucesso!");
  })
  .catch((error) => {
    console.error("Erro ao conectar com o banco de dados:", error);
  });

module.exports = sequelize;
