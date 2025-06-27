const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Empresa } = require("./Empresa");

const ReferenciaPessoalEmpresa = sequelize.define(
  "ReferenciaPessoalEmpresa",
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
    nome: {
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
    tableName: "referencias_pessoais_empresa",
    timestamps: false,
  }
);

// Associação
Empresa.hasMany(ReferenciaPessoalEmpresa, {
  foreignKey: "empresa_id",
  as: "referencias_pessoais",
});

ReferenciaPessoalEmpresa.belongsTo(Empresa, {
  foreignKey: "empresa_id",
  as: "empresa",
});

module.exports = { ReferenciaPessoalEmpresa };