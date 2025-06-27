const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Empresa } = require("./Empresa");

const ReferenciaMotoristaEmpresa = sequelize.define(
  "ReferenciaMotoristaEmpresa",
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
    tableName: "referencias_motoristas_empresa",
    timestamps: false,
  }
);

// Associação
Empresa.hasMany(ReferenciaMotoristaEmpresa, {
  foreignKey: "empresa_id",
  as: "referencias_motoristas",
});

ReferenciaMotoristaEmpresa.belongsTo(Empresa, {
  foreignKey: "empresa_id",
  as: "empresa",
});

module.exports = { ReferenciaMotoristaEmpresa };
