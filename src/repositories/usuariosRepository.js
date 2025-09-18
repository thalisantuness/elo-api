const s3 = require("../utils/awsConfig");
    const { v4: uuidv4 } = require("uuid");
    const sharp = require("sharp");
    const bcrypt = require("bcrypt");
    const { Usuario } = require("../model/Usuarios");
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
          comprovante_residencia_dono_caminhao: null,
          antt: null,
          cnh: null,
          placa_1: null,
          placa_2: null,
          placa_3: null,
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
              ContentType: 'image/jpeg',
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
                ContentType: 'image/jpeg',
              }).promise();
              
              uploadResults[docName] = docUploadResult.Location;
            } catch (error) {
              console.error(`Erro ao processar documento ${docName}:`, error);
              throw new Error(`Falha no upload do documento ${docName}`);
            }
          }
        }

        // Remove os campos de documentos do objeto usuario para evitar Base64
        const { 
          antt, 
          cnh, 
          comprovante_residencia_motorista, 
          documento_dono_caminhao, 
          comprovante_residencia_dono_caminhao, 
          placa_1,
          placa_2,
          placa_3,
          ...cleanUsuario 
        } = usuario;

        // Adiciona log para depuração
        console.log('Dados para Usuario.create:', JSON.stringify({
          ...cleanUsuario,
          senha: '[SENHA_HASH_REDACTED]',
          ...uploadResults
        }, null, 2));

        // Cria usuário com dados limpos e URLs processadas
        const usuarioCriado = await Usuario.create({
          ...cleanUsuario,
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
            returning: true, // Retorna os registros atualizados
        });
        
        if (updatedRows > 0) {
            // Se a atualização foi bem-sucedida, busca e retorna o usuário atualizado
            return await Usuario.findByPk(id);
        }
        
        return null; // Retorna nulo se nenhum usuário for atualizado
    }

    module.exports = {
      listarUsuarios,
      criarUsuario,
      buscarUsuarioPorId,
      buscarUsuarioPorEmail,
      atualizarUsuario,
      deletarUsuario,
      atualizarPerfil,
    };

