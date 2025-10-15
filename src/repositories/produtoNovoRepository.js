const { ProdutoNovo } = require('../model/ProdutoNovo');
const { ProdutoFoto } = require('../model/ProdutoFoto');
const { Estado } = require('../model/Estado');

async function listarProdutos(filtros = {}) {
  return await ProdutoNovo.findAll({
    where: filtros,
    include: [ { model: Estado, as: 'estado', attributes: ['estado_id','nome'] }, { model: ProdutoFoto, as: 'fotos', attributes: ['photo_id','imageData'] } ],
    order: [['data_cadastro','DESC']]
  });
}

async function buscarProdutoPorId(id) {
  return await ProdutoNovo.findByPk(id, {
    include: [ { model: Estado, as: 'estado', attributes: ['estado_id','nome'] }, { model: ProdutoFoto, as: 'fotos', attributes: ['photo_id','imageData'] } ]
  });
}

async function criarProduto(dados) {
  return await ProdutoNovo.create(dados);
}

async function atualizarProduto(id, dados) {
  const produto = await ProdutoNovo.findByPk(id);
  if (!produto) throw new Error('Produto não encontrado');
  await produto.update(dados);
  return produto;
}

async function deletarProduto(id) {
  const produto = await ProdutoNovo.findByPk(id, { include: [{ model: ProdutoFoto, as: 'fotos' }] });
  if (!produto) throw new Error('Produto não encontrado');
  if (produto.fotos?.length) {
    await ProdutoFoto.destroy({ where: { produto_id: id } });
  }
  await produto.destroy();
  return { message: 'Produto deletado com sucesso' };
}

async function adicionarFoto(produto_id, imageData) {
  return await ProdutoFoto.create({ produto_id, imageData });
}

module.exports = {
  listarProdutos,
  buscarProdutoPorId,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  adicionarFoto,
};


