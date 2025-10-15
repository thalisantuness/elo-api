const { Produto } = require('../model/Produto');

async function listarProdutos() {
  return await Produto.findAll({
    order: [['nome', 'ASC']]
  });
}

async function buscarProdutoPorId(id) {
  return await Produto.findByPk(id);
}

async function criarProduto(dadosProduto) {
  const { nome, preco, preco_venda, quantidade, data_vencimento } = dadosProduto;

  // Validações básicas
  if (!nome || !preco || !preco_venda || !quantidade) {
    throw new Error('Nome, preço, preço de venda e quantidade são obrigatórios');
  }

  const produto = await Produto.create({ 
    nome, 
    preco, 
    preco_venda, 
    quantidade, 
    data_vencimento 
  });
  return produto;
}

async function atualizarProduto(id, dadosAtualizados) {
  const produto = await Produto.findByPk(id);

  if (!produto) {
    throw new Error('Produto não encontrado');
  }

  // Valida se está tentando atualizar a quantidade para valor negativo
  if (dadosAtualizados.quantidade !== undefined && dadosAtualizados.quantidade < 0) {
    throw new Error('Quantidade não pode ser negativa');
  }

  await produto.update(dadosAtualizados);
  return produto;
}

async function deletarProduto(id) {
  const produto = await Produto.findByPk(id);

  if (!produto) {
    throw new Error('Produto não encontrado');
  }

  await produto.destroy();
  return { message: 'Produto deletado com sucesso' };
}

// Método adicional específico para Produto
async function atualizarEstoque(id, quantidade) {
  const produto = await Produto.findByPk(id);

  if (!produto) {
    throw new Error('Produto não encontrado');
  }

  const novaQuantidade = produto.quantidade + quantidade;
  
  if (novaQuantidade < 0) {
    throw new Error('Quantidade em estoque não pode ser negativa');
  }

  await produto.update({ quantidade: novaQuantidade });
  return produto;
}

module.exports = {
  listarProdutos,
  buscarProdutoPorId,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  atualizarEstoque
};