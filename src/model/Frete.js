const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");
const { Usuario } = require("./Usuarios");

const Frete = sequelize.define(
  "Frete",
  {
    frete_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "usuario_id",
      },
    },
    motorista_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "usuarios",
        key: "usuario_id",
      },
    },
    data_criacao: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    data_prevista_entrega: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    origem_estado: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    origem_cidade: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    destino_estado: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    destino_cidade: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    valor_frete: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    },
    precisa_lona: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    produto_quimico: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    observacoes_motorista: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    veiculo_tracao: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    tipos_carreta: {
      type: Sequelize.STRING, 
      allowNull: true,
    },
    comprimento_carreta: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_eixos: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    configuracao_modelo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    tipo_carga: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    observacoes_carga: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM(
        "anunciado",
        "em_andamento",
        "finalizado",
        "cancelado"
      ),
      defaultValue: "anunciado",
    },
  },
  {
    schema: "public",
    tableName: "fretes",
    timestamps: false,
  }
);

Frete.belongsTo(Usuario, { foreignKey: "empresa_id", as: "Empresa" });
Frete.belongsTo(Usuario, { foreignKey: "motorista_id", as: "Motorista" });

module.exports = { Frete };
