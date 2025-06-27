const { Sequelize } = require("sequelize");
const sequelize = require("../utils/db");

const Usuario = sequelize.define(
  "Usuario",
  {
    usuario_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    role: {
      type: Sequelize.ENUM("motorista", "empresa"),
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    senha: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    nome_completo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    celular: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    cpf: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    cnpj: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    data_nascimento: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    endereco: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    // Referências pessoais
    nome_referencia_pessoal_1: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_pessoal_1: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    nome_referencia_pessoal_2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_pessoal_2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    nome_referencia_pessoal_3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_pessoal_3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    // Referências comerciais
    nome_referencia_comercial_1: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_comercial_1: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    nome_referencia_comercial_2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_comercial_2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    nome_referencia_comercial_3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_comercial_3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    // Referências motoristas (para empresas)
    nome_referencia_motorista_1: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_motorista_1: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    nome_referencia_motorista_2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_motorista_2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    nome_referencia_motorista_3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_motorista_3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    // Dados administrativos (para empresas)
    nome_responsavel_administrativo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    telefone_responsavel_administrativo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    alvara: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    comprovante_empresa: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    documento_empresa: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    // Referências transportadoras (para motoristas)
    nome_referencia_transportadora_1: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_transportadora_1: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    nome_referencia_transportadora_2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_transportadora_2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    nome_referencia_transportadora_3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_transportadora_3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    nome_referencia_transportadora_4: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_transportadora_4: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    nome_referencia_transportadora_5: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_referencia_transportadora_5: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    // Dados de veículos (para motoristas)
    numero_placas: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    placa_1: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    placa_2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    placa_3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    antt: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    cnh: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    comprovante_residencia_motorista: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    documento_dono_caminhao: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    comprovante_residencia_dono_caminhao: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    // Dados bancários
    banco: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    agencia: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    numero_conta: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    tipo_conta: {
      type: Sequelize.ENUM("Corrente", "Poupança"),
      allowNull: true,
    },
    titular_conta: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    cpf_titular_conta: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    // Controle de datas
    data_cadastro: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    data_atualizacao: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    imagem_perfil: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    schema: "public",
    tableName: "usuarios",
    timestamps: false,
  }
);

module.exports = { Usuario };