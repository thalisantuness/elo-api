const { Campanha } = require('../model/Campanha');
const { Usuario } = require('../model/Usuarios');

async function criar(dados) {
  const { empresa_id, titulo, descricao, imagem_url, recompensas, data_inicio, data_fim, ativa } = dados;
  if (!titulo || !data_inicio || !data_fim) {
    throw new Error('titulo, data_inicio e data_fim são obrigatórios');
  }
  return Campanha.create({
    empresa_id,
    titulo,
    descricao: descricao || null,
    imagem_url: imagem_url || null,
    recompensas: Array.isArray(recompensas) ? recompensas : [],
    data_inicio,
    data_fim,
    ativa: ativa !== false,
  });
}

async function listarPorEmpresa(empresa_id) {
  return Campanha.findAll({
    where: { empresa_id },
    order: [['data_cadastro', 'DESC']],
  });
}

async function listarTodas() {
  return Campanha.findAll({
    include: [{
      model: Usuario,
      as: 'empresa',
      attributes: ['usuario_id', 'nome', 'email'],
    }],
    order: [['data_cadastro', 'DESC']],
  });
}

async function buscarPorId(id) {
  const campanha = await Campanha.findByPk(id, {
    include: [{
      model: Usuario,
      as: 'empresa',
      attributes: ['usuario_id', 'nome', 'email'],
    }],
  });
  if (!campanha) {
    throw new Error(`Campanha com ID ${id} não encontrada`);
  }
  return campanha;
}

async function atualizar(id, dados) {
  const campanha = await buscarPorId(id);
  const { titulo, descricao, imagem_url, recompensas, data_inicio, data_fim, ativa } = dados;
  const atualizacao = {};
  if (titulo !== undefined) atualizacao.titulo = titulo;
  if (descricao !== undefined) atualizacao.descricao = descricao;
  if (imagem_url !== undefined) atualizacao.imagem_url = imagem_url;
  if (recompensas !== undefined) atualizacao.recompensas = Array.isArray(recompensas) ? recompensas : campanha.recompensas;
  if (data_inicio !== undefined) atualizacao.data_inicio = data_inicio;
  if (data_fim !== undefined) atualizacao.data_fim = data_fim;
  if (ativa !== undefined) atualizacao.ativa = ativa;
  await Campanha.update(atualizacao, { where: { campanha_id: id } });
  return buscarPorId(id);
}

async function excluir(id) {
  await buscarPorId(id);
  await Campanha.destroy({ where: { campanha_id: id } });
  return true;
}

module.exports = {
  criar,
  listarPorEmpresa,
  listarTodas,
  buscarPorId,
  atualizar,
  excluir,
};