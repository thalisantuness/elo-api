const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
// const { ReferenciaPessoal } = require("./ReferenciaPessoal");
// const { ReferenciaTransportadora } = require("./ReferenciaTransportadora");
// const { ContaBancaria } = require("./ContaBancaria");
// const { Usuario } = require("./Usuarios");


const Motorista = sequelize.define(
  "Motorista",
  {
    motorista_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    n_rg: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    n_cpf: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    dt_nascimento: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    endereco: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    n_placas: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    antt: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    cnh: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    cp_residencia: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    doc_dono_caminhao: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    cp_residencia_dono_caminhao: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    // usuario_id: {
    //   type: Sequelize.INTEGER,
    //   allowNull: false,
    //   unique: true,
    //   references: {
    //     model: Usuario,
    //     key: "usuario_id",
    //   },
    // },

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
    tableName: "motorista",
    timestamps: false,
  }
);

// Motorista.hasMany(ReferenciaPessoal, {
//   foreignKey: "motorista_id",
//   as: "referencia-pessoal",
// });

// Motorista.hasMany(ReferenciaTransportadora, {
//   foreignKey: "motorista_id",
//   as: "referencia-transportadora",
// });

// Motorista.hasOne(ContaBancaria, {
//   foreignKey: "motorista_id",
//   as: "conta_bancaria",
// });

// Motorista.belongsTo(Usuario, {
//   foreignKey: "usuario_id",
//   as: "usuario",
// });

module.exports = { Motorista };
