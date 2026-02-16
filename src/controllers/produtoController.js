const produtoRepo = require('../repositories/produtoRepository');
const usuariosRepo = require('../repositories/usuariosRepository');
const imageUpload = require('../utils/imageUpload');
const { Op } = require('sequelize');

/** Opções padrão de upload para produtos (foto principal e secundárias). */
const OPCOES_IMAGEM_PRODUTO = { maxWidth: 800, maxHeight: 800, quality: 80 };

function ProdutoController() {
  /**
   * Retorna a string base64 da foto principal do body.
   * Aceita imagem_base64 ou foto_principal (padrão do frontend).
   */
  function getFotoPrincipalBase64(body) {
    const v = body.imagem_base64 || body.foto_principal;
    return v && typeof v === 'string' && v.startsWith('data:image') ? v : null;
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
        fotos_secundarias, valor_custo, quantidade, empresa_id 
      } = req.body;
      const imagemPrincipalBase64 = getFotoPrincipalBase64(req.body);

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

      // Processar foto principal (aceita imagem_base64 ou foto_principal no body)
      if (imagemPrincipalBase64) {
        try {
          dados.foto_principal = await imageUpload.uploadImageFromBase64(
            imagemPrincipalBase64,
            'produtos/principal',
            OPCOES_IMAGEM_PRODUTO
          );
        } catch (error) {
          console.error('❌ Erro no upload da foto principal:', error.message);
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
              const url = await imageUpload.uploadImageFromBase64(
                base64,
                'produtos/secundarias',
                OPCOES_IMAGEM_PRODUTO
              );
              await produtoRepo.adicionarFoto(produto.produto_id, url);
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

      // Processar foto principal se fornecida (aceita imagem_base64 ou foto_principal em base64)
      const novaFotoPrincipalBase64 = getFotoPrincipalBase64(dados);
      if (novaFotoPrincipalBase64) {
        try {
          dados.foto_principal = await imageUpload.uploadImageFromBase64(
            novaFotoPrincipalBase64,
            'produtos/principal',
            OPCOES_IMAGEM_PRODUTO
          );
        } catch (error) {
          console.error('❌ Erro no upload da foto principal:', error.message);
          return res.status(400).json({ 
            error: `Erro ao processar imagem: ${error.message}`
          });
        }
      }
      // Não enviar base64 para o repositório (apenas URL ou nada)
      delete dados.imagem_base64;
      if (typeof dados.foto_principal === 'string' && dados.foto_principal.startsWith('data:image')) {
        delete dados.foto_principal; // era base64 e deu erro antes; não sobrescrever com lixo
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
        const url = await imageUpload.uploadImageFromBase64(
          imageBase64,
          'produtos/secundarias',
          OPCOES_IMAGEM_PRODUTO
        );
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