const produtoRepository = require('../repositories/produtoRepository');

function ProdutoController() {

  async function getProdutos(req, res) {
    try {
      const produtos = await produtoRepository.listarProdutos();

      if (produtos.length === 0) {
        return res.status(404).json({ error: 'Nenhum produto encontrado' });
      }

      res.json(produtos);
    } catch (error) {
      console.error('Erro ao obter produtos:', error);
      res.status(500).json({ error: 'Erro ao obter produtos' });
    }
  }

  async function getProdutoById(req, res) {
    try {
      const { id } = req.params;
      const produto = await produtoRepository.buscarProdutoPorId(id);

      if (!produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      res.json(produto);
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      res.status(500).json({ error: 'Erro ao buscar produto' });
    }
  }

  async function postProduto(req, res) {
    try {
      const { nome, preco, preco_venda, quantidade, data_vencimento } = req.body;

      // Validações
      if (!nome) {
        return res.status(400).json({ error: 'O nome do produto é obrigatório' });
      }
      if (!preco || preco <= 0) {
        return res.status(400).json({ error: 'O preço deve ser maior que zero' });
      }
      if (!preco_venda || preco_venda <= 0) {
        return res.status(400).json({ error: 'O preço de venda deve ser maior que zero' });
      }
      if (!quantidade || quantidade < 0) {
        return res.status(400).json({ error: 'A quantidade não pode ser negativa' });
      }

      const novoProduto = await produtoRepository.criarProduto({
        nome,
        preco,
        preco_venda,
        quantidade,
        data_vencimento
      });
      
      res.status(201).json(novoProduto);
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      res.status(500).json({ error: 'Erro ao criar produto' });
    }
  }

  async function putProduto(req, res) {
    try {
      const { id } = req.params;
      const dadosAtualizados = req.body;

      // Valida se está tentando atualizar a quantidade para valor negativo
      if (dadosAtualizados.quantidade !== undefined && dadosAtualizados.quantidade < 0) {
        return res.status(400).json({ error: 'Quantidade não pode ser negativa' });
      }

      const produtoAtualizado = await produtoRepository.atualizarProduto(id, dadosAtualizados);
      
      if (!produtoAtualizado) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      res.json(produtoAtualizado);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  }

  async function deleteProduto(req, res) {
    try {
      const { id } = req.params;

      const resultado = await produtoRepository.deletarProduto(id);
      res.json(resultado);
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      res.status(500).json({ error: 'Erro ao deletar produto' });
    }
  }

  async function patchEstoque(req, res) {
    try {
      const { id } = req.params;
      const { quantidade } = req.body;

      if (quantidade === undefined) {
        return res.status(400).json({ error: 'A quantidade é obrigatória' });
      }

      const produto = await produtoRepository.atualizarEstoque(id, quantidade);
      res.json(produto);
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      res.status(500).json({ error: error.message || 'Erro ao atualizar estoque' });
    }
  }

  return {
    getProdutos,
    getProdutoById,
    postProduto,
    putProduto,
    deleteProduto,
    patchEstoque
  };
}

module.exports = ProdutoController;