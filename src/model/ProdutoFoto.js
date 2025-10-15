const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { ProdutoNovo } = require("./ProdutoNovo");

const ProdutoFoto = sequelize.define(
  "ProdutoFoto",
  {
    photo_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    produto_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: ProdutoNovo,
        key: "produto_id",
      },
    },
    imageData: {
      type: Sequelize.STRING,
      allowNull: false,
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
    tableName: "produto_foto",
    timestamps: false,
  }
);

ProdutoFoto.belongsTo(ProdutoNovo, { foreignKey: "produto_id", as: "produto" });
ProdutoNovo.hasMany(ProdutoFoto, { foreignKey: "produto_id", as: "fotos" });

module.exports = { ProdutoFoto };


