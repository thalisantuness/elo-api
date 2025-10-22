const repo = require("../repositories/servicoPrestadoRepository");
const sharp = require('sharp');
const s3 = require('../utils/awsConfig');
const { v4: uuidv4 } = require('uuid');

function ServicoPrestadoController() {
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
    return parts[1];
  }

  async function compressImage(buffer) {
    try {
      return await sharp(buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      throw new Error(`Erro ao processar imagem: ${error.message}`);
    }
  }

  async function uploadToS3(buffer, folder) {
    try {
      const key = `${folder}/${uuidv4()}.jpg`;
      const result = await s3.upload({ 
        Bucket: process.env.AWS_BUCKET_NAME, 
        Key: key, 
        Body: buffer, 
        ContentType: 'image/jpeg',
        ACL: 'public-read'
      }).promise();
      return result.Location;
    } catch (error) {
      throw error;
    }
  }

  async function listar(req, res) {
    try {
      const servicos = await repo.listarServicos(req.query || {});
      res.json(servicos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async function criar(req, res) {
    try {
      const { nome, valor, foto_principal, empresa_id } = req.body;
      const dados = { nome, valor, empresa_id };

      if (foto_principal && foto_principal.startsWith('data:image')) {
        try {
          const base64Data = validateBase64Image(foto_principal);
          const buffer = Buffer.from(base64Data, 'base64');
          const compressed = await compressImage(buffer);
          dados.foto_principal = await uploadToS3(compressed, 'servicos');
        } catch (error) {
          return res.status(400).json({ 
            error: `Erro ao processar foto: ${error.message}`
          });
        }
      }

      const servico = await repo.criarServico(dados);
      res.status(201).json(servico);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async function buscarPorId(req, res) {
    try {
      const servico = await repo.buscarServicoPorId(req.params.id);
      res.json(servico);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async function atualizar(req, res) {
    try {
      const { foto_principal } = req.body;
      const dados = { ...req.body };

      if (foto_principal && foto_principal.startsWith('data:image')) {
        try {
          const base64Data = validateBase64Image(foto_principal);
          const buffer = Buffer.from(base64Data, 'base64');
          const compressed = await compressImage(buffer);
          dados.foto_principal = await uploadToS3(compressed, 'servicos');
        } catch (error) {
          return res.status(400).json({ 
            error: `Erro ao processar foto: ${error.message}`
          });
        }
      }

      const servico = await repo.atualizarServico(req.params.id, dados);
      res.json(servico);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async function excluir(req, res) {
    try {
      await repo.deletarServico(req.params.id);
      res.json({ message: "Serviço excluído com sucesso" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  return { listar, criar, buscarPorId, atualizar, excluir };
}

module.exports = ServicoPrestadoController;


