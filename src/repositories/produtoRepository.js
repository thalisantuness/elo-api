const { Produto } = require('../model/Produto');
const { Foto } = require('../model/Foto');

async function listarProdutos(filtros = {}) {
  const produtos = await Produto.findAll({
    where: filtros,
    include: [{ model: Foto, as: 'fotos', attributes: ['photo_id', 'imageData'] }],
    order: [['data_cadastro', 'DESC']]
  });

  // Formatar os dados: padronizar para imageData (principal) e photos (secundárias)
  return produtos.map(produto => {
    const produtoData = produto.toJSON();
    
    // Criar array de fotos secundárias no formato correto
    const photos = produtoData.fotos ? produtoData.fotos
      .map(foto => {
        // Garantir que fotos secundárias nunca retornem base64
        let imageDataFinal = foto.imageData;
        if (imageDataFinal && imageDataFinal.startsWith('data:image')) {
          console.warn(`Foto ${foto.photo_id} tem base64. Limpando.`);
          imageDataFinal = null;
        }
        return {
          photo_id: foto.photo_id,
          imageData: imageDataFinal
        };
      })
      .filter(foto => foto.imageData !== null) // Remover fotos inválidas
      : [];

    // Garantir que nunca retornamos base64, apenas URLs do S3
    let fotoPrincipalFinal = produtoData.foto_principal;
    if (fotoPrincipalFinal && fotoPrincipalFinal.startsWith('data:image')) {
      // Se por algum motivo tiver base64 no banco, retornar null ou limpar
      console.warn(`Produto ${produtoData.produto_id} tem base64 em foto_principal. Limpando.`);
      fotoPrincipalFinal = null; // Não retornar base64
    }

    return {
      produto_id: produtoData.produto_id,
      nome: produtoData.nome,
      valor: produtoData.valor,
      valor_custo: produtoData.valor_custo,
      quantidade: produtoData.quantidade,
      tipo_comercializacao: produtoData.tipo_comercializacao,
      tipo_produto: produtoData.tipo_produto,
      empresa_id: produtoData.empresa_id,
      imageData: fotoPrincipalFinal,  // Principal como imageData (compat)
      foto_principal: fotoPrincipalFinal, // Campo explícito para o frontend
      photos: photos,  // Secundárias como photos
      data_cadastro: produtoData.data_cadastro,
      data_update: produtoData.data_update
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
  const photos = produtoData.fotos ? produtoData.fotos
    .map(foto => {
      // Garantir que fotos secundárias nunca retornem base64
      let imageDataFinal = foto.imageData;
      if (imageDataFinal && imageDataFinal.startsWith('data:image')) {
        console.warn(`Foto ${foto.photo_id} tem base64. Limpando.`);
        imageDataFinal = null;
      }
      return {
        photo_id: foto.photo_id,
        imageData: imageDataFinal
      };
    })
    .filter(foto => foto.imageData !== null) // Remover fotos inválidas
    : [];

  // Garantir que nunca retornamos base64, apenas URLs do S3
  let fotoPrincipalFinal = produtoData.foto_principal;
  if (fotoPrincipalFinal && fotoPrincipalFinal.startsWith('data:image')) {
    // Se por algum motivo tiver base64 no banco, retornar null ou limpar
    console.warn(`Produto ${produtoData.produto_id} tem base64 em foto_principal. Limpando.`);
    fotoPrincipalFinal = null; // Não retornar base64
  }

  return {
    produto_id: produtoData.produto_id,
    nome: produtoData.nome,
    valor: produtoData.valor,
    valor_custo: produtoData.valor_custo,
    quantidade: produtoData.quantidade,
    tipo_comercializacao: produtoData.tipo_comercializacao,
    tipo_produto: produtoData.tipo_produto,
      empresa_id: produtoData.empresa_id,
    imageData: fotoPrincipalFinal,  // Principal como imageData (compat)
    foto_principal: fotoPrincipalFinal, // Campo explícito para o frontend
    photos: photos,  // Secundárias como photos
    data_cadastro: produtoData.data_cadastro,
    data_update: produtoData.data_update
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

async function deletarFoto(produto_id, photo_id) {
  const foto = await Foto.findOne({ 
    where: { photo_id, produto_id }
  });
  
  if (!foto) {
    throw new Error('Foto não encontrada ou não pertence a este produto');
  }
  
  await foto.destroy();
  return { message: 'Foto deletada com sucesso' };
}

module.exports = {
  listarProdutos,
  buscarProdutoPorId,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  adicionarFoto,
  deletarFoto,
};