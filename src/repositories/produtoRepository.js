const { Produto } = require('../model/Produto');
const { Foto } = require('../model/Foto');

async function listarProdutos(filtros = {}) {
  const produtos = await Produto.findAll({
    where: filtros,
    include: [{ model: Foto, as: 'fotos', attributes: ['photo_id', 'imageData'] }],
    order: [['data_cadastro', 'DESC']]
  });

  // Formatar os dados conforme o padrão da imagem
  return produtos.map(produto => {
    const produtoData = produto.toJSON();
    
    // Criar array de fotos secundárias no formato correto
    const photos = produtoData.fotos ? produtoData.fotos.map(foto => ({
      photo_id: foto.photo_id,
      imageData: foto.imageData
    })) : [];

    return {
      ...produtoData,
      imageData: produtoData.foto_principal, // foto principal como imageData
      photos: photos
    };
  });
}

async function buscarProdutoPorId(id) {
  const produto = await Produto.findByPk(id, {
    include: [{ model: Foto, as: 'fotos', attributes: ['photo_id', 'imageData'] }]
  });

  if (!produto) return null;

  const produtoData = produto.toJSON();
  
  // Criar array de fotos secundárias no formato correto
  const photos = produtoData.fotos ? produtoData.fotos.map(foto => ({
    photo_id: foto.photo_id,
    imageData: foto.imageData
  })) : [];

  return {
    ...produtoData,
    imageData: produtoData.foto_principal, // foto principal como imageData
    photos: photos
  };
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


