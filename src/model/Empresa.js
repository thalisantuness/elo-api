const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");

const Empresa = sequelize.define(
  "Empresa",
  {
    empresa_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      unique: true,
    },
    nome_completo: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    celular: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    cpf: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    responsavel_administrativo: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    telefone_responsavel: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    cnpj: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    alvara: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    comprovante_residencia: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    documento_pessoa_cadastro: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    data_cadastro: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    data_update: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  },
  {
    schema: "public",
    tableName: "empresa",
    timestamps: false,
  }
);

Empresa.associate = function(models) {
  Empresa.belongsTo(models.Usuario, {
    foreignKey: "usuario_id",
    as: "usuario",
  });
  
  Empresa.hasMany(models.ReferenciaPessoalEmpresa, {
    foreignKey: "empresa_id",
    as: "referencias_pessoais",
  });

  Empresa.hasMany(models.ReferenciaFornecedor, {
    foreignKey: "empresa_id",
    as: "referencias_fornecedores",
  });

  Empresa.hasMany(models.ReferenciaMotoristaEmpresa, {
    foreignKey: "empresa_id",
    as: "referencias_motoristas",
  });
};

module.exports = Empresa;