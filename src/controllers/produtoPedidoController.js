const repo = require("../repositories/produtoPedidoRepository");
const sharp = require('sharp');
const s3 = require('../utils/awsConfig');
const { v4: uuidv4 } = require('uuid');

function ProdutoPedidoController() {
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
      const itens = await repo.listarProdutosPedido(req.query || {});
      res.json(itens);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async function criar(req, res) {
    try {
      const { nome, valor, foto_principal, empresa_id } = req.body;  // Adicionado empresa_id
      const dados = { nome, valor, empresa_id };  // Adicionado

      if (foto_principal && foto_principal.startsWith('data:image')) {
        try {
          const base64Data = validateBase64Image(foto_principal);
          const buffer = Buffer.from(base64Data, 'base64');
          const compressed = await compressImage(buffer);
          dados.foto_principal = await uploadToS3(compressed, 'produtos-pedido');
        } catch (error) {
          return res.status(400).json({ 
            error: `Erro ao processar foto: ${error.message}`
          });
        }
      }

      // Opcional: Pegue empresa_id do token autenticado para segurança
      // const empresa_id = req.user.empresa_id;

      const item = await repo.criarProdutoPedido(dados);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async function buscarPorId(req, res) {
    try {
      const item = await repo.buscarProdutoPedidoPorId(req.params.id);
      res.json(item);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async function atualizar(req, res) {
    try {
      const { foto_principal, ...outrosDados } = req.body;
      const dados = { ...outrosDados };

      if (foto_principal && foto_principal.startsWith('data:image')) {
        try {
          const base64Data = validateBase64Image(foto_principal);
          const buffer = Buffer.from(base64Data, 'base64');
          const compressed = await compressImage(buffer);
          dados.foto_principal = await uploadToS3(compressed, 'produtos-pedido');
        } catch (error) {
          return res.status(400).json({ 
            error: `Erro ao processar foto: ${error.message}`
          });
        }
      }

      const item = await repo.atualizarProdutoPedido(req.params.id, dados);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async function excluir(req, res) {
    try {
      await repo.deletarProdutoPedido(req.params.id);
      res.json({ message: "ProdutoPedido excluído com sucesso" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  return { listar, criar, buscarPorId, atualizar, excluir };
}

module.exports = ProdutoPedidoController;