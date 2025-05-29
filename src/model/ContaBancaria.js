const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
// const { Motorista } = require("./Motorista");

const ContaBancaria = sequelize.define(
  "ContaBancaria",
  {
    conta_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // motorista_id: {
    //   type: Sequelize.INTEGER,
    //   allowNull: false,
    //   unique: true,
    //   references: {
    //     model: Motorista,
    //     key: "motorista_id",
    //   },
    // },
    banco: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    agencia: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    numero_conta: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    tipo_conta: {
      type: Sequelize.ENUM("Corrente", "Poupança"),
      allowNull: false,
    },
    titular: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    cpf_titular: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    schema: "public",
    tableName: "conta_bancaria",
    timestamps: false,
  }
);

// ContaBancaria.belongsTo(Motorista, {
//   foreignKey: "motorista_id",
//   as: "motorista",
// });

module.exports = { ContaBancaria };