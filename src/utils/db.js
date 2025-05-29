const { Sequelize } = require("sequelize");
require("dotenv").config();

// Verificação explícita da senha
if (!process.env.PGPASSWORD) {
  throw new Error("PGPASSWORD não está definida nas variáveis de ambiente!");
}

const sequelize = new Sequelize({
  database: process.env.PGDATABASE || "railway",
  username: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD.toString(), // Garante que é string
  host: process.env.PGHOST || "postgres.railway.internal",
  port: parseInt(process.env.PGPORT) || 5432, // Garante que é número
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Teste de conexão mais informativo
sequelize.authenticate()
  .then(() => {
    console.log("✅ Conexão com o banco de dados estabelecida com sucesso!");
    console.log(`📊 Banco: ${sequelize.config.database}`);
    console.log(`🖥️ Host: ${sequelize.config.host}`);
  })
  .catch((error) => {
    console.error("❌ Erro ao conectar com o banco de dados:");
    console.error("Detalhes do erro:", error.original || error);
    console.log("Variáveis usadas:", {
      database: sequelize.config.database,
      user: sequelize.config.username,
      host: sequelize.config.host,
      port: sequelize.config.port
    });
    process.exit(1); // Encerra o processo com erro
  });

module.exports = sequelize;