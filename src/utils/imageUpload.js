/**
 * Utilitário compartilhado para validação e upload de imagens base64 para o S3.
 * Usado por: produtoController, usuariosRepository, recompensasRepository, campanhasRepository.
 */
const s3 = require('./awsConfig');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

/**
 * Valida string base64 de imagem. Lança se inválida.
 * @param {string} base64String - String no formato "data:image/...;base64,..."
 * @returns {string} - Parte dos dados base64 (após a vírgula)
 */
function validateBase64Image(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('String base64 inválida');
  }
  if (!base64String.startsWith('data:image/')) {
    throw new Error('String não é uma imagem base64 válida');
  }
  const parts = base64String.split(',');
  if (parts.length !== 2) {
    throw new Error('Formato base64 inválido');
  }
  const base64Data = parts[1];
  if (!base64Data || base64Data.length < 100) {
    throw new Error('Dados de imagem base64 muito pequenos ou vazios');
  }
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64Data)) {
    throw new Error('Dados base64 contêm caracteres inválidos');
  }
  return base64Data;
}

/**
 * Faz upload de imagem base64 para o S3 (valida, comprime e envia).
 * @param {string} base64Image - Imagem no formato "data:image/...;base64,..."
 * @param {string} folder - Pasta no bucket (ex: 'produtos/principal', 'usuarios/perfil')
 * @param {object} options - Opções de redimensionamento: { maxWidth, maxHeight, quality }
 * @returns {Promise<string>} - URL pública da imagem no S3
 */
async function uploadImageFromBase64(base64Image, folder, options = {}) {
  const { maxWidth = 800, maxHeight = 800, quality = 80 } = options;

  if (!base64Image || !base64Image.startsWith('data:image')) {
    throw new Error('Formato de imagem Base64 inválido');
  }

  validateBase64Image(base64Image);
  const buffer = Buffer.from(base64Image.split(',')[1], 'base64');

  const compressedBuffer = await sharp(buffer)
    .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();

  const key = `${folder}/${uuidv4()}.jpg`;
  const result = await s3.upload({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: compressedBuffer,
    ContentType: 'image/jpeg',
    ACL: 'public-read',
  }).promise();

  return result.Location;
}

/**
 * Remove arquivo do S3 a partir da URL pública.
 * @param {string} fileUrl - URL do arquivo no S3
 */
async function deleteFromS3(fileUrl) {
  if (!fileUrl || !fileUrl.includes(process.env.AWS_BUCKET_NAME)) {
    return;
  }
  try {
    const key = fileUrl.split('.com/')[1];
    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    }).promise();
  } catch (error) {
    console.error('Erro ao deletar arquivo do S3:', error);
  }
}

module.exports = {
  validateBase64Image,
  uploadImageFromBase64,
  deleteFromS3,
};
