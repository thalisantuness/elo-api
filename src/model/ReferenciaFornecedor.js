const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Empresa } = require("./Empresa");

const ReferenciaFornecedor = sequelize.define(
  "ReferenciaFornecedor",
  {
    referencia_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: Empresa,
        key: "empresa_id",
      },
    },
    nome_empresa: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    contato: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    schema: "public",
    tableName: "referencias_fornecedores",
    timestamps: false,
  }
);

// Associação
Empresa.hasMany(ReferenciaFornecedor, {
  foreignKey: "empresa_id",
  as: "referencias_fornecedores",
});

ReferenciaFornecedor.belongsTo(Empresa, {
  foreignKey: "empresa_id",
  as: "empresa",
});

module.exports = { ReferenciaFornecedor };