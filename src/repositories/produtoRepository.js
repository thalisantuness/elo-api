const { Produto } = require('../model/Produto');
const { Foto } = require('../model/Foto');

async function listarProdutos(filtros = {}) {
  return await Produto.findAll({
    where: filtros,
    // include: [ { model: Estado, as: 'estado', attributes: ['estado_id','nome'] }, { model: Foto, as: 'fotos', attributes: ['photo_id','imageData'] } ],
    // order: [['data_cadastro','DESC']]
  });
}

async function buscarProdutoPorId(id) {
  return await Produto.findByPk(id, {
    // include: [ { model: Estado, as: 'estado', attributes: ['estado_id','nome'] }, { model: Foto, as: 'fotos', attributes: ['photo_id','imageData'] } ]
  });
}

async function criarProduto(dados) {
  return await Produto.create(dados);
}

async function atualizarProduto(id, dados) {
  const produto = await Produto.findByPk(id);
  if (!produto) throw new Error('Produto não encontrado');
  await produto.update(dados);
  return produto;
}

async function deletarProduto(id) {
  const produto = await Produto.findByPk(id, { include: [{ model: Foto, as: 'fotos' }] });
  if (!produto) throw new Error('Produto não encontrado');
  if (produto.fotos?.length) {
    await Foto.destroy({ where: { produto_id: id } });
  }
  await produto.destroy();
  return { message: 'Produto deletado com sucesso' };
}

async function adicionarFoto(produto_id, imageData) {
  return await Foto.create({ produto_id, imageData });
}

module.exports = {
  listarProdutos,
  buscarProdutoPorId,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  adicionarFoto,
};


