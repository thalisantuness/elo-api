const { Motorista } = require("../model/Motorista");
const { ReferenciaPessoal } = require("../model/ReferenciaPessoal");
const { ReferenciaTransportadora } = require("../model/ReferenciaTransportadora");
const { ContaBancaria } = require("../model/ContaBancaria");
const { Usuario } = require("../model/Usuarios");
const sharp = require('sharp');
const s3 = require('../utils/awsConfig');
const { v4: uuidv4 } = require('uuid');
const sequelize = require("../utils/db");


async function listarMotorista(filtros = {}) {
  return await Motorista.findAll({
    where: filtros,
    include: [
      { model: ReferenciaPessoal, as: "referencia_pessoal", attributes: ["referencia_id", "nome"] },
    ],
  });
}

async function criarMotoristaCompleto(dados) {
  const { 
    usuario, 
    dadosMotorista, 
    referenciasPessoais = [], 
    referenciasTransportadoras = [], 
    contaBancaria,
    imagemBase64 
  } = dados;

  return sequelize.transaction(async (t) => {
    // 1. Cria usuário
    const usuarioCriado = await Usuario.create({
      email: usuario.email,
      senha: usuario.senha,
      role: 'motorista'
    }, { transaction: t });

    // 2. Processa imagem principal (igual ao Imovel)
    let imageUrl = null;
    if (imagemBase64) {
      const imagemBuffer = Buffer.from(imagemBase64.split(',')[1], 'base64');
      const imagemComprimida = await sharp(imagemBuffer)
        .resize(500, 500)
        .jpeg({ quality: 80 })
        .toBuffer();
      
      imageUrl = await s3.upload({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `motoristas/${uuidv4()}.jpg`,
        Body: imagemComprimida,
        ContentType: 'image/jpeg'
      }).promise();
    }

    // 3. Processa documentos (antt, cnh, etc.) - adapte conforme necessário
    const documentosProcessados = {};
    const documentosParaProcessar = [
      'antt', 'cnh', 'cp_residencia', 
      'doc_dono_caminhao', 'cp_residencia_dono_caminhao'
    ];

    for (const doc of documentosParaProcessar) {
      if (dadosMotorista[doc] && dadosMotorista[doc].startsWith('data:image')) {
        const docBuffer = Buffer.from(dadosMotorista[doc].split(',')[1], 'base64');
        const docComprimido = await sharp(docBuffer)
          .resize(800, 800)
          .jpeg({ quality: 80 })
          .toBuffer();
        
        const docUrl = await s3.upload({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `motoristas/documentos/${uuidv4()}.jpg`,
          Body: docComprimido,
          ContentType: 'image/jpeg'
        }).promise();
        
        documentosProcessados[doc] = docUrl.Location;
      }
    }

    // 4. Cria motorista com as URLs
    const motoristaCriado = await Motorista.create({
      usuario_id: usuarioCriado.usuario_id,
      ...dadosMotorista,
      ...documentosProcessados, // Inclui as URLs dos documentos
      imageData: imageUrl?.Location || null // URL da imagem principal
    }, { transaction: t });

    // 5. Cria referências transportadoras
    await ReferenciaTransportadora.bulkCreate(
      referenciasTransportadoras.map(ref => ({
        motorista_id: motoristaCriado.motorista_id,
        ...ref
      })),
      { transaction: t }
    );

    // 6. Cria conta bancária
    if (contaBancaria) {
      await ContaBancaria.create({
        motorista_id: motoristaCriado.motorista_id,
        ...contaBancaria
      }, { transaction: t });
    }

    return {
      usuario: usuarioCriado,
      motorista: motoristaCriado
    };
  });
}

module.exports = {
  listarMotorista,
  criarMotoristaCompleto
};
