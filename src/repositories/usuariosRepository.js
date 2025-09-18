const s3 = require("../utils/awsConfig");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const bcrypt = require("bcrypt");
const { Usuario } = require("../model/Usuarios");
const sequelize = require("../utils/db");

// Helper para deletar um arquivo do S3 a partir da URL
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
      .resize(800)
      .jpeg({ quality: 80 })
      .toBuffer();

    const uploadResult = await s3.upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${folder}/${uuidv4()}.jpg`,
      Body: compressedBuffer,
      ContentType: 'image/jpeg',
    }).promise();

    return uploadResult.Location;
  } catch (error) {
    console.error('Erro ao fazer upload para o S3:', error);
    throw new Error('Falha no upload da imagem');
  }
}

async function criarUsuario(dados) {
  const {
    usuario,
    imagemBase64,
    documentos
  } = dados;

  const senhaHash = await bcrypt.hash(usuario.senha, 10);

  return sequelize.transaction(async (t) => {
    const uploadResults = {};

    if (imagemBase64 && imagemBase64.startsWith('data:image')) {
      uploadResults.imagem_perfil = await uploadToS3(imagemBase64, 'usuarios/perfil');
    }

    for (const [docName, docBase64] of Object.entries(documentos)) {
      if (docBase64 && docBase64.startsWith('data:image')) {
        uploadResults[docName] = await uploadToS3(docBase64, 'usuarios/documentos');
      }
    }

    const usuarioCriado = await Usuario.create({
      ...usuario,
      senha: senhaHash,
      ...uploadResults
    }, { transaction: t });

    return usuarioCriado;
  });
}

async function buscarUsuarioPorId(id) {
  return await Usuario.findByPk(id);
}

async function buscarUsuarioPorEmail(email) {
  return await Usuario.findOne({ where: { email } });
}

async function atualizarUsuario(id, dados) {
  return await Usuario.update(dados, {
    where: { usuario_id: id },
    returning: true,
  });
}

async function deletarUsuario(id) {
  return await Usuario.destroy({ where: { usuario_id: id } });
}

async function atualizarPerfil(id, dadosPerfil) {
  const [updatedRows] = await Usuario.update(dadosPerfil, {
    where: { usuario_id: id },
    returning: true,
  });
  if (updatedRows > 0) {
    return await Usuario.findByPk(id);
  }
  return null;
}

// NOVA FUNÇÃO: Necessária para a validação da senha antiga
async function buscarUsuarioPorIdComSenha(id) {
  // Esta função busca o usuário incluindo o campo 'senha', que normalmente é excluído
  const usuario = await Usuario.findOne({
    where: { usuario_id: id },
    attributes: { include: ['senha'] }
  });
  return usuario;
}


// NOVA FUNÇÃO: Lida com a substituição de um documento
async function atualizarDocumentoUsuario(usuarioId, docType, imageBase64) {
  return sequelize.transaction(async (t) => {
    const usuario = await Usuario.findByPk(usuarioId, { transaction: t });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const oldFileUrl = usuario[docType];
    if (oldFileUrl) {
      await deleteFromS3(oldFileUrl);
    }

    const folder = docType === 'imagem_perfil' ? 'usuarios/perfil' : 'usuarios/documentos';
    const newFileUrl = await uploadToS3(imageBase64, folder);

    usuario[docType] = newFileUrl;
    await usuario.save({ transaction: t });

    const usuarioAtualizado = usuario.toJSON();
    delete usuarioAtualizado.senha;
    return usuarioAtualizado;
  });
}

module.exports = {
  criarUsuario,
  buscarUsuarioPorId,
  buscarUsuarioPorEmail,
  atualizarUsuario,
  deletarUsuario,
  atualizarPerfil,
  buscarUsuarioPorIdComSenha,
  atualizarDocumentoUsuario,
  listarUsuarios: async (filtros = {}) => await Usuario.findAll({ where: filtros }),
};

