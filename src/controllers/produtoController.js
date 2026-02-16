const produtoRepo = require('../repositories/produtoRepository');
const usuariosRepo = require('../repositories/usuariosRepository');
const sharp = require('sharp');
const s3 = require('../utils/awsConfig');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

function ProdutoController() {
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

  async function compressImage(buffer) {
    try {
      if (!buffer || buffer.length === 0) {
        throw new Error('Buffer de imagem vazio');
      }

      const metadata = await sharp(buffer).metadata();
      console.log('Metadata da imagem:', metadata);
      
      if (!metadata.format) {
        throw new Error('Formato de imagem não suportado');
      }
      
      return await sharp(buffer)
        .resize(800, 800, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error('Erro ao comprimir imagem:', error.message);
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
      
      console.log(`✅ Upload realizado com sucesso: ${result.Location}`);
      return result.Location;
    } catch (error) {
      console.error('❌ Erro no upload para S3:', error.message);
      throw error;
    }
  }

  async function listar(req, res) {
    try {
      const filtros = req.query || {};
      
      if (req.user) {
        console.log('🔍 Usuário autenticado:', {
          usuario_id: req.user.usuario_id,
          role: req.user.role
        });

        const usuarioCompleto = await usuariosRepo.buscarUsuarioPorId(req.user.usuario_id);
        
        if (req.user.role === 'cdl') {
          const lojas = await usuariosRepo.listarLojasPorCdl(req.user.usuario_id);
          const idsLojas = lojas.map(l => l.usuario_id);
          idsLojas.push(req.user.usuario_id);
          filtros.empresa_id = { [Op.in]: idsLojas };
          console.log('🏢 CDL - IDs:', idsLojas);
        }
        else if (req.user.role === 'empresa') {
          filtros.empresa_id = req.user.usuario_id;
          console.log('🏬 Loja - vendo apenas seus produtos');
        }
        else if (req.user.role === 'cliente' && usuarioCompleto?.cdl_id) {
          const lojas = await usuariosRepo.listarLojasPorCdl(usuarioCompleto.cdl_id);
          const idsLojas = lojas.map(l => l.usuario_id);
          filtros.empresa_id = { [Op.in]: idsLojas };
          console.log('👤 Cliente - vendo produtos das lojas da CDL');
        }
      }
      
      const produtos = await produtoRepo.listarProdutos(filtros);
      res.json(produtos);
    } catch (e) {
      console.error('❌ Erro ao listar produtos:', e);
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
      const { 
        nome, valor, tipo_comercializacao, tipo_produto, 
        imagem_base64,  // <-- CORRIGIDO: usar imagem_base64
        fotos_secundarias, valor_custo, quantidade, empresa_id 
      } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'Autenticação necessária para criar produto' });
      }

      const rolesPermitidas = ['empresa', 'cdl', 'admin'];
      if (!rolesPermitidas.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Apenas empresas, CDLs e administradores podem criar produtos' 
        });
      }

      if (!nome || !valor || !valor_custo || !quantidade) {
        return res.status(400).json({ error: 'nome, valor, valor_custo e quantidade são obrigatórios' });
      }

      let empresaIdFinal = empresa_id;
      
      if (req.user.role === 'empresa') {
        empresaIdFinal = req.user.usuario_id;
      } 
      else if (req.user.role === 'cdl') {
        empresaIdFinal = req.user.usuario_id;
      }
      else if (req.user.role === 'admin') {
        empresaIdFinal = empresa_id || req.user.usuario_id;
      }

      if (!empresaIdFinal) {
        return res.status(400).json({ error: 'empresa_id é obrigatório' });
      }

      const dados = { 
        nome, 
        valor, 
        tipo_comercializacao, 
        tipo_produto, 
        valor_custo, 
        quantidade,
        empresa_id: empresaIdFinal
      };

      // Processar imagem_base64 (NÃO foto_principal)
      if (imagem_base64 && imagem_base64.startsWith('data:image')) {
        try {
          console.log('📸 Processando imagem_base64...');
          const base64Data = validateBase64Image(imagem_base64);
          const buffer = Buffer.from(base64Data, 'base64');
          const compressed = await compressImage(buffer);
          const url = await uploadToS3(compressed, 'produtos/principal');
          dados.foto_principal = url; // Salva a URL no campo foto_principal
          console.log('✅ Foto principal salva:', url);
        } catch (error) {
          console.error('❌ Erro no upload:', error.message);
          return res.status(400).json({ 
            error: `Erro ao processar imagem: ${error.message}`
          });
        }
      }

      console.log('📦 Criando produto com dados:', dados);
      const produto = await produtoRepo.criarProduto(dados);

      // Processar fotos secundárias
      if (Array.isArray(fotos_secundarias)) {
        for (const base64 of fotos_secundarias) {
          if (base64 && base64.startsWith('data:image')) {
            try {
              const base64Data = validateBase64Image(base64);
              const buf = Buffer.from(base64Data, 'base64');
              const comp = await compressImage(buf);
              const url = await uploadToS3(comp, 'produtos/secundarias');
              await produtoRepo.adicionarFoto(produto.produto_id, url);
              console.log('✅ Foto secundária salva:', url);
            } catch (error) {
              console.error('❌ Erro em foto secundária:', error.message);
            }
          }
        }
      }

      // Buscar produto completo com fotos
      const produtoCompleto = await produtoRepo.buscarProdutoPorId(produto.produto_id);
      res.status(201).json(produtoCompleto);
    } catch (e) {
      console.error('❌ Erro ao criar produto:', e);
      res.status(500).json({ error: 'Erro ao criar produto' });
    }
  }

  async function atualizar(req, res) {
    try {
      const { id } = req.params;
      const dados = { ...req.body };

      const produto = await produtoRepo.buscarProdutoPorId(id);
      if (!produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      if (produto.empresa_id !== req.user.usuario_id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para atualizar este produto' });
      }

      // Processar imagem_base64 se fornecida
      if (dados.imagem_base64 && dados.imagem_base64.startsWith('data:image')) {
        try {
          console.log('📸 Atualizando imagem...');
          const base64Data = validateBase64Image(dados.imagem_base64);
          const buffer = Buffer.from(base64Data, 'base64');
          const compressed = await compressImage(buffer);
          const url = await uploadToS3(compressed, 'produtos/principal');
          dados.foto_principal = url;
          delete dados.imagem_base64; // Remove o campo temporário
        } catch (error) {
          console.error('❌ Erro no upload:', error.message);
          return res.status(400).json({ 
            error: `Erro ao processar imagem: ${error.message}`
          });
        }
      }

      const produtoAtualizado = await produtoRepo.atualizarProduto(id, dados);
      res.json(produtoAtualizado);
    } catch (e) {
      console.error('Erro ao atualizar produto:', e);
      res.status(500).json({ error: e.message || 'Erro ao atualizar produto' });
    }
  }

  async function deletar(req, res) {
    try {
      const { id } = req.params;
      
      const produto = await produtoRepo.buscarProdutoPorId(id);
      if (!produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      if (produto.empresa_id !== req.user.usuario_id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para deletar este produto' });
      }

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

      const produto = await produtoRepo.buscarProdutoPorId(id);
      if (!produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      if (produto.empresa_id !== req.user.usuario_id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para adicionar fotos' });
      }
      
      try {
        const base64Data = validateBase64Image(imageBase64);
        const buf = Buffer.from(base64Data, 'base64');
        const comp = await compressImage(buf);
        const url = await uploadToS3(comp, 'produtos/secundarias');
        
        const foto = await produtoRepo.adicionarFoto(id, url);
        res.status(201).json(foto);
      } catch (error) {
        console.error('Erro no upload:', error.message);
        res.status(400).json({ error: error.message });
      }
    } catch (e) {
      console.error('Erro ao adicionar foto:', e);
      res.status(500).json({ error: 'Erro ao adicionar foto' });
    }
  }

  async function deletarFoto(req, res) {
    try {
      const { id, fotoId } = req.params;
      
      const produto = await produtoRepo.buscarProdutoPorId(id);
      if (!produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      if (produto.empresa_id !== req.user.usuario_id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para deletar fotos' });
      }

      const resultado = await produtoRepo.deletarFoto(id, fotoId);
      res.json(resultado);
    } catch (e) {
      console.error('Erro ao deletar foto:', e);
      res.status(400).json({ error: e.message || 'Erro ao deletar foto' });
    }
  }

  return { 
    listar, 
    buscarPorId, 
    criar, 
    atualizar, 
    deletar, 
    adicionarFoto, 
    deletarFoto 
  };
}

module.exports = ProdutoController;