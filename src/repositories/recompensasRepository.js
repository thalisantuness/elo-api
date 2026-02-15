const { Recompensas } = require('../model/Recompensas');
const sequelize = require("../utils/db");
const s3 = require("../utils/awsConfig");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

// ==================== FUNÇÕES DE UPLOAD (IGUAL AO USUÁRIO) ====================

async function deleteFromS3(fileUrl) {
  if (!fileUrl || !fileUrl.includes(process.env.AWS_BUCKET_NAME)) {
    console.log("URL inválida ou não pertence ao bucket. Nenhuma ação de exclusão tomada.");
    return;
  }
  try {
    const key = fileUrl.split('.com/')[1];
    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    }).promise();
    console.log(`Arquivo deletado do S3: ${key}`);
  } catch (error) {
    console.error("Erro ao deletar arquivo do S3:", error);
  }
}

// Helper para fazer upload de uma nova imagem para o S3
async function uploadToS3(base64Image, folder) {
  if (!base64Image || !base64Image.startsWith('data:image')) {
    throw new Error('Formato de imagem Base64 inválido');
  }
  try {
    const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
    const compressedBuffer = await sharp(buffer)
      .resize(500, 500, { fit: 'inside', withoutEnlargement: true }) // Tamanho bom para recompensas
      .jpeg({ quality: 85 })
      .toBuffer();

    const key = `${folder}/${uuidv4()}.jpg`;
    const uploadResult = await s3.upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: compressedBuffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read'
    }).promise();

    console.log(`Upload realizado com sucesso: ${uploadResult.Location}`);
    return uploadResult.Location;
  } catch (error) {
    console.error('Erro ao fazer upload para o S3:', error);
    throw new Error('Falha no upload da imagem');
  }
}

// ==================== FUNÇÕES DE RECOMPENSA ====================

async function listarRecompensas(usuario_id) {
    return Recompensas.findAll({ 
      where: { usuario_id },
      order: [['data_cadastro', 'DESC']]
    });
}

async function buscarRecompensaPorId(id) {
    const recompensa = await Recompensas.findByPk(id);
    if (!recompensa) {
        throw new Error(`Recompensa com ID ${id} não encontrada`);
    }
    return recompensa;
}

async function criarRecompensa(dadosRecompensa) {
    const { nome, descricao, imagem_base64, pontos, estoque, usuario_id } = dadosRecompensa;
    
    if (!nome) {
        throw new Error('Nome da recompensa é obrigatório');
    }

    return sequelize.transaction(async (t) => {
      let imagem_url = null;
      
      // Fazer upload da imagem se fornecida (igual ao usuário)
      if (imagem_base64 && imagem_base64.startsWith('data:image')) {
        try {
          imagem_url = await uploadToS3(imagem_base64, 'recompensas');
          console.log('Imagem da recompensa enviada para S3:', imagem_url);
        } catch (uploadError) {
          console.error('Erro no upload da imagem:', uploadError);
          throw new Error(`Erro ao processar imagem da recompensa: ${uploadError.message}`);
        }
      }

      return Recompensas.create({
          nome,
          descricao: descricao || null,
          imagem_url,
          pontos: pontos || 0,
          estoque: estoque || 0,
          usuario_id,
      }, { transaction: t });
    });
}

async function atualizarRecompensa(id, dadosAtualizados) {
    const { nome, descricao, imagem_base64, pontos, estoque } = dadosAtualizados;
    
    return sequelize.transaction(async (t) => {
      const recompensa = await Recompensas.findByPk(id, { transaction: t });
      
      if (!recompensa) {
          throw new Error(`Recompensa com ID ${id} não encontrada`);
      }
      
      const atualizacao = {};
      
      if (nome !== undefined) atualizacao.nome = nome;
      if (descricao !== undefined) atualizacao.descricao = descricao;
      if (pontos !== undefined) atualizacao.pontos = pontos;
      if (estoque !== undefined) atualizacao.estoque = estoque;
      
      // Processar nova imagem se fornecida (igual ao usuário)
      if (imagem_base64 && imagem_base64.startsWith('data:image')) {
        // Deletar imagem antiga do S3 se existir
        if (recompensa.imagem_url && recompensa.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
          await deleteFromS3(recompensa.imagem_url);
        }
        
        // Upload da nova imagem
        atualizacao.imagem_url = await uploadToS3(imagem_base64, 'recompensas');
      } else if (imagem_base64 === null) {
        // Se enviar null, deletar imagem antiga
        if (recompensa.imagem_url && recompensa.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
          await deleteFromS3(recompensa.imagem_url);
        }
        atualizacao.imagem_url = null;
      }
      
      await Recompensas.update(atualizacao, {
          where: { recom_id: id },
          transaction: t
      });
      
      return buscarRecompensaPorId(id);
    });
}

async function excluirRecompensa(id) {
    return sequelize.transaction(async (t) => {
      const recompensa = await Recompensas.findByPk(id, { transaction: t });
      
      if (!recompensa) {
          throw new Error(`Recompensa com ID ${id} não encontrada`);
      }
      
      // Deletar imagem do S3 se existir (igual ao usuário)
      if (recompensa.imagem_url && recompensa.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
          await deleteFromS3(recompensa.imagem_url);
      }
      
      await Recompensas.destroy({ 
          where: { recom_id: id },
          transaction: t 
      });
      
      return true;
    });
}

module.exports = {
    listarRecompensas,
    buscarRecompensaPorId,
    criarRecompensa,
    atualizarRecompensa,
    excluirRecompensa,
};