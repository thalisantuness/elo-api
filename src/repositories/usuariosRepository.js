const { Usuario } = require("../model/Usuarios");
const bcrypt = require("bcrypt");
const sharp = require("sharp");
const s3 = require("../utils/awsConfig");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("../utils/db");

async function listarUsuarios(filtros = {}) {
  return await Usuario.findAll({
    where: filtros,
  });
}

async function criarUsuario(dados) {
    const { 
        usuario, 
        imagemBase64,
        documentos 
    } = dados;

    // Hash da senha
    const senhaHash = await bcrypt.hash(usuario.senha, 10);

    return sequelize.transaction(async (t) => {
        // Objeto para armazenar as URLs processadas
        const uploadResults = {
            imagem_perfil: null,
            comprovante_residencia_motorista: null,
            documento_dono_caminhao: null,
            comprovante_residencia_dono_caminhao: null
        };

        // Processa imagem de perfil
        if (imagemBase64 && imagemBase64.startsWith('data:image')) {
            try {
                const imagemBuffer = Buffer.from(imagemBase64.split(',')[1], 'base64');
                const imagemComprimida = await sharp(imagemBuffer)
                    .resize(500, 500)
                    .jpeg({ quality: 80 })
                    .toBuffer();
                
                const uploadResult = await s3.upload({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: `usuarios/${uuidv4()}.jpg`,
                    Body: imagemComprimida,
                    ContentType: 'image/jpeg'
                }).promise();
                
                uploadResults.imagem_perfil = uploadResult.Location;
            } catch (error) {
                console.error('Erro ao processar imagem de perfil:', error);
                throw new Error('Falha no upload da imagem de perfil');
            }
        }

        // Processa documentos
        for (const [docName, docBase64] of Object.entries(documentos)) {
            if (docBase64 && docBase64.startsWith('data:image')) {
                try {
                    const docBuffer = Buffer.from(docBase64.split(',')[1], 'base64');
                    const docComprimido = await sharp(docBuffer)
                        .resize(800, 800)
                        .jpeg({ quality: 80 })
                        .toBuffer();
                    
                    const docUploadResult = await s3.upload({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: `usuarios/documentos/${uuidv4()}.jpg`,
                        Body: docComprimido,
                        ContentType: 'image/jpeg'
                    }).promise();
                    
                    uploadResults[docName] = docUploadResult.Location;
                } catch (error) {
                    console.error(`Erro ao processar documento ${docName}:`, error);
                    throw new Error(`Falha no upload do documento ${docName}`);
                }
            }
        }

        // Cria usuário com todos os dados
        const usuarioCriado = await Usuario.create({
            ...usuario,
            senha: senhaHash,
            ...uploadResults // Inclui todas as URLs processadas
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

module.exports = {
  listarUsuarios,
  criarUsuario,
  buscarUsuarioPorId,
  buscarUsuarioPorEmail,
  atualizarUsuario,
  deletarUsuario,
};