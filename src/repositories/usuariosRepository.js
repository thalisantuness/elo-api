const s3 = require("../utils/awsConfig");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const bcrypt = require("bcrypt");
const { Usuario } = require("../model/Usuarios");
const sequelize = require("../utils/db");

// Helper para deletar um arquivo do S3 a partir da URL
async function deleteFromS3(fileUrl) {
  if (!fileUrl || !fileUrl.includes(process.env.AWS_BUCKET_NAME)) {
    console.log("URL inválida ou não pertence ao bucket.");
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
  const { usuario, fotoPerfilBase64 } = dados;

  const senhaHash = await bcrypt.hash(usuario.senha, 10);

  return sequelize.transaction(async (t) => {
    let foto_perfil = null;

    if (fotoPerfilBase64 && fotoPerfilBase64.startsWith('data:image')) {
      foto_perfil = await uploadToS3(fotoPerfilBase64, 'usuarios/perfil');
    }

    const usuarioCriado = await Usuario.create({
      ...usuario,
      senha: senhaHash,
      foto_perfil
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

async function buscarUsuarioPorIdComSenha(id) {
  const usuario = await Usuario.findOne({
    where: { usuario_id: id },
    attributes: { include: ['senha'] }
  });
  return usuario;
}

async function atualizarFotoPerfil(usuarioId, imageBase64) {
  return sequelize.transaction(async (t) => {
    const usuario = await Usuario.findByPk(usuarioId, { transaction: t });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const oldFileUrl = usuario.foto_perfil;
    if (oldFileUrl) {
      await deleteFromS3(oldFileUrl);
    }

    const newFileUrl = await uploadToS3(imageBase64, 'usuarios/perfil');

    usuario.foto_perfil = newFileUrl;
    await usuario.save({ transaction: t });

    const usuarioAtualizado = usuario.toJSON();
    delete usuarioAtualizado.senha;
    return usuarioAtualizado;
  });
}

async function listarUsuarios(filtros = {}) {
  return await Usuario.findAll({ where: filtros });
}

module.exports = {
  criarUsuario,
  buscarUsuarioPorId,
  buscarUsuarioPorEmail,
  atualizarUsuario,
  deletarUsuario,
  atualizarPerfil,
  buscarUsuarioPorIdComSenha,
  atualizarFotoPerfil,
  listarUsuarios,
};

