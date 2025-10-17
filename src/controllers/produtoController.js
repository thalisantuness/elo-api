const produtoRepo = require('../repositories/produtoRepository');
const sharp = require('sharp');
const s3 = require('../utils/awsConfig');
const { v4: uuidv4 } = require('uuid');

function ProdutoController() {
  async function compressImage(buffer) {
    return sharp(buffer).resize(800).jpeg({ quality: 80 }).toBuffer();
  }

  async function uploadToS3(buffer, folder) {
    const key = `${folder}/${uuidv4()}.jpg`;
    const result = await s3.upload({ Bucket: process.env.AWS_BUCKET_NAME, Key: key, Body: buffer, ContentType: 'image/jpeg' }).promise();
    return result.Location;
  }

  async function listar(req, res) {
    try {
      const filtros = req.query || {};
      const produtos = await produtoRepo.listarProdutos(filtros);
      res.json(produtos);
    } catch (e) {
      console.error('Erro ao listar produtos:', e);
      res.status(500).json({ error: 'Erro ao listar produtos' });
    }
  }

  async function buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const produto = await produtoRepo.buscarProdutoPorId(id);
      if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
      res.json(produto);
    } catch (e) {
      console.error('Erro ao buscar produto:', e);
      res.status(500).json({ error: 'Erro ao buscar produto' });
    }
  }

  async function criar(req, res) {
    try {
      const { nome, valor, tipo_comercializacao, tipo_produto, estado_id, foto_principal, fotos_secundarias, valor_custo, quantidade } = req.body;

      if (!nome || !valor || !valor_custo || !quantidade) {
        return res.status(400).json({ error: 'nome, valor, valor_custo e quantidade são obrigatórios' });
      }

      const dados = { nome, valor, tipo_comercializacao, tipo_produto, estado_id, valor_custo, quantidade };

      if (foto_principal && foto_principal.startsWith('data:image')) {
        const buffer = Buffer.from(foto_principal.split(',')[1], 'base64');
        const compressed = await compressImage(buffer);
        dados.foto_principal = await uploadToS3(compressed, 'produtos/principal');
      }

      const produto = await produtoRepo.criarProduto(dados);

      if (Array.isArray(fotos_secundarias)) {
        for (const base64 of fotos_secundarias) {
          if (base64 && base64.startsWith('data:image')) {
            const buf = Buffer.from(base64.split(',')[1], 'base64');
            const comp = await compressImage(buf);
            const url = await uploadToS3(comp, 'produtos/secundarias');
            await produtoRepo.adicionarFoto(produto.produto_id, url);
          }
        }
      }

      res.status(201).json(produto);
    } catch (e) {
      console.error('Erro ao criar produto:', e);
      res.status(500).json({ error: 'Erro ao criar produto' });
    }
  }

  async function atualizar(req, res) {
    try {
      const { id } = req.params;
      const dados = req.body;
      const produto = await produtoRepo.atualizarProduto(id, dados);
      res.json(produto);
    } catch (e) {
      console.error('Erro ao atualizar produto:', e);
      res.status(500).json({ error: e.message || 'Erro ao atualizar produto' });
    }
  }

  async function deletar(req, res) {
    try {
      const { id } = req.params;
      const resultado = await produtoRepo.deletarProduto(id);
      res.json(resultado);
    } catch (e) {
      console.error('Erro ao deletar produto:', e);
      res.status(500).json({ error: 'Erro ao deletar produto' });
    }
  }

  async function adicionarFoto(req, res) {
    try {
      const { id } = req.params;
      const { imageBase64 } = req.body;
      if (!imageBase64 || !imageBase64.startsWith('data:image')) {
        return res.status(400).json({ error: 'Imagem inválida' });
      }
      const buf = Buffer.from(imageBase64.split(',')[1], 'base64');
      const comp = await compressImage(buf);
      const url = await uploadToS3(comp, 'produtos/secundarias');
      const foto = await produtoRepo.adicionarFoto(id, url);
      res.status(201).json(foto);
    } catch (e) {
      console.error('Erro ao adicionar foto:', e);
      res.status(500).json({ error: 'Erro ao adicionar foto' });
    }
  }

  return { listar, buscarPorId, criar, atualizar, deletar, adicionarFoto };
}

module.exports = ProdutoController;