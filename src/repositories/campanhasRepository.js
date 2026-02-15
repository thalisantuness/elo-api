const { Campanha } = require('../model/Campanha');
const { Usuario } = require('../model/Usuarios');
const sequelize = require("../utils/db");
const s3 = require("../utils/awsConfig");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

// ==================== FUNÇÕES DE UPLOAD ====================

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

async function uploadToS3(base64Image, folder) {
  if (!base64Image || !base64Image.startsWith('data:image')) {
    throw new Error('Formato de imagem Base64 inválido');
  }
  try {
    const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
    const compressedBuffer = await sharp(buffer)
      .resize(1200, 630, { fit: 'inside', withoutEnlargement: true })
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

// ==================== FUNÇÕES DE CAMPANHA ====================

async function criar(dados) {
  const { empresa_id, titulo, descricao, imagem_base64, produtos, recompensas, data_inicio, data_fim, ativa } = dados;
  
  if (!titulo || !data_inicio || !data_fim) {
    throw new Error('titulo, data_inicio e data_fim são obrigatórios');
  }

  return sequelize.transaction(async (t) => {
    let imagem_url = null;
    
    if (imagem_base64 && imagem_base64.startsWith('data:image')) {
      try {
        imagem_url = await uploadToS3(imagem_base64, 'campanhas');
        console.log('Imagem da campanha enviada para S3:', imagem_url);
      } catch (uploadError) {
        console.error('Erro no upload da imagem:', uploadError);
        throw new Error(`Erro ao processar imagem da campanha: ${uploadError.message}`);
      }
    }

    const campanhaCriada = await Campanha.create({
      empresa_id,
      titulo,
      descricao: descricao || null,
      imagem_url,
      produtos: Array.isArray(produtos) ? produtos : [],
      recompensas: Array.isArray(recompensas) ? recompensas : [],
      data_inicio,
      data_fim,
      ativa: ativa !== false,
    }, { transaction: t });

    return campanhaCriada;
  });
}

async function listarPorEmpresa(empresa_id) {
  return Campanha.findAll({
    where: { empresa_id },
    order: [['data_cadastro', 'DESC']],
  });
}

async function listarTodas() {
  return Campanha.findAll({
    include: [{
      model: Usuario,
      as: 'empresa',
      attributes: ['usuario_id', 'nome', 'email', 'foto_perfil', 'cidade', 'estado'],
    }],
    order: [['data_cadastro', 'DESC']],
  });
}

async function listarPorCdl(cdl_id) {
  // Busca campanhas de todas as lojas da CDL e da própria CDL
  return Campanha.findAll({
    include: [{
      model: Usuario,
      as: 'empresa',
      where: {
        [Op.or]: [
          { usuario_id: cdl_id }, // A própria CDL
          { empresa_pai_id: cdl_id } // Lojas da CDL
        ]
      },
      attributes: ['usuario_id', 'nome', 'role'],
    }],
    order: [['data_cadastro', 'DESC']],
  });
}

async function buscarPorId(id) {
  const campanha = await Campanha.findByPk(id, {
    include: [{
      model: Usuario,
      as: 'empresa',
      attributes: ['usuario_id', 'nome', 'email', 'foto_perfil', 'role', 'cidade', 'estado'],
    }],
  });
  
  if (!campanha) {
    throw new Error(`Campanha com ID ${id} não encontrada`);
  }
  
  return campanha;
}

async function atualizar(id, dados) {
  const { titulo, descricao, imagem_base64, produtos, recompensas, data_inicio, data_fim, ativa } = dados;
  
  return sequelize.transaction(async (t) => {
    const campanha = await Campanha.findByPk(id, { transaction: t });
    
    if (!campanha) {
      throw new Error(`Campanha com ID ${id} não encontrada`);
    }
    
    const atualizacao = {};
    
    if (titulo !== undefined) atualizacao.titulo = titulo;
    if (descricao !== undefined) atualizacao.descricao = descricao;
    if (produtos !== undefined) atualizacao.produtos = Array.isArray(produtos) ? produtos : campanha.produtos;
    if (recompensas !== undefined) atualizacao.recompensas = Array.isArray(recompensas) ? recompensas : campanha.recompensas;
    if (data_inicio !== undefined) atualizacao.data_inicio = data_inicio;
    if (data_fim !== undefined) atualizacao.data_fim = data_fim;
    if (ativa !== undefined) atualizacao.ativa = ativa;
    
    if (imagem_base64 && imagem_base64.startsWith('data:image')) {
      if (campanha.imagem_url && campanha.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
        await deleteFromS3(campanha.imagem_url);
      }
      atualizacao.imagem_url = await uploadToS3(imagem_base64, 'campanhas');
    } else if (imagem_base64 === null) {
      if (campanha.imagem_url && campanha.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
        await deleteFromS3(campanha.imagem_url);
      }
      atualizacao.imagem_url = null;
    }
    
    await Campanha.update(atualizacao, { 
      where: { campanha_id: id },
      transaction: t 
    });
    
    return buscarPorId(id);
  });
}

async function excluir(id) {
  return sequelize.transaction(async (t) => {
    const campanha = await Campanha.findByPk(id, { transaction: t });
    
    if (!campanha) {
      throw new Error(`Campanha com ID ${id} não encontrada`);
    }
    
    if (campanha.imagem_url && campanha.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
      await deleteFromS3(campanha.imagem_url);
    }
    
    await Campanha.destroy({ 
      where: { campanha_id: id },
      transaction: t 
    });
    
    return true;
  });
}

module.exports = {
  criar,
  listarPorEmpresa,
  listarTodas,
  listarPorCdl,
  buscarPorId,
  atualizar,
  excluir,
};