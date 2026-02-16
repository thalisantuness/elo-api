const { Campanha } = require('../model/Campanha');
const { Usuario } = require('../model/Usuarios');
const sequelize = require("../utils/db");
const imageUpload = require("../utils/imageUpload");
const { Op } = require('sequelize');

/** Opções de imagem para campanhas (banner 1200x630, quality 85). */
const OPCOES_IMAGEM_CAMPANHA = { maxWidth: 1200, maxHeight: 630, quality: 85 };

// ==================== FUNÇÕES DE CAMPANHA ====================

async function criar(dados) {
  const { empresa_id, titulo, descricao, imagem_base64, produtos, recompensas, data_inicio, data_fim, ativa } = dados;
  
  if (!titulo || !data_inicio || !data_fim) {
    throw new Error('titulo, data_inicio e data_fim são obrigatórios');
  }

  return sequelize.transaction(async (t) => {
    let imagem_url = null;
    
    if (imagem_base64 && imagem_base64.startsWith('data:image')) {
      try {
        imagem_url = await imageUpload.uploadImageFromBase64(
          imagem_base64,
          'campanhas',
          OPCOES_IMAGEM_CAMPANHA
        );
      } catch (uploadError) {
        console.error('Erro no upload da imagem:', uploadError);
        throw new Error(`Erro ao processar imagem da campanha: ${uploadError.message}`);
      }
    }

    const campanhaCriada = await Campanha.create({
      empresa_id,
      titulo,
      descricao: descricao || null,
      imagem_url,
      produtos: Array.isArray(produtos) ? produtos : [],
      recompensas: Array.isArray(recompensas) ? recompensas : [],
      data_inicio,
      data_fim,
      ativa: ativa !== false,
    }, { transaction: t });

    return campanhaCriada;
  });
}

async function listarPorEmpresa(empresa_id) {
  return Campanha.findAll({
    where: { empresa_id },
    include: [{
      model: Usuario,
      as: 'empresa',
      attributes: ['usuario_id', 'nome', 'role', 'cdl_id']
    }],
    order: [['data_cadastro', 'DESC']],
  });
}

async function listarTodas() {
  return Campanha.findAll({
    include: [{
      model: Usuario,
      as: 'empresa',
      attributes: ['usuario_id', 'nome', 'email', 'foto_perfil', 'cidade', 'estado', 'role', 'cdl_id'],
    }],
    order: [['data_cadastro', 'DESC']],
  });
}

async function listarPorCdl(cdl_id) {
  // Primeiro busca todas as lojas desta CDL
  const lojas = await Usuario.findAll({
    where: { 
      role: 'empresa',
      cdl_id: cdl_id
    },
    attributes: ['usuario_id']
  });
  
  const idsLojas = lojas.map(l => l.usuario_id);
  
  // Busca campanhas da própria CDL e das lojas
  return Campanha.findAll({
    where: {
      [Op.or]: [
        { empresa_id: cdl_id }, // Campanhas da própria CDL
        { empresa_id: { [Op.in]: idsLojas } } // Campanhas das lojas
      ]
    },
    include: [{
      model: Usuario,
      as: 'empresa',
      attributes: ['usuario_id', 'nome', 'role', 'cdl_id']
    }],
    order: [['data_cadastro', 'DESC']],
  });
}

async function listarPorCliente(cdl_id) {
  // Cliente vê campanhas ativas da CDL e das lojas da CDL
  const lojas = await Usuario.findAll({
    where: { 
      role: 'empresa',
      cdl_id: cdl_id,
      status: 'ativo'
    },
    attributes: ['usuario_id']
  });
  
  const idsLojas = lojas.map(l => l.usuario_id);
  const agora = new Date();
  
  return Campanha.findAll({
    where: {
      [Op.or]: [
        { empresa_id: cdl_id }, // Campanhas da própria CDL
        { empresa_id: { [Op.in]: idsLojas } } // Campanhas das lojas
      ],
      ativa: true,
      data_inicio: { [Op.lte]: agora },
      data_fim: { [Op.gte]: agora }
    },
    include: [{
      model: Usuario,
      as: 'empresa',
      attributes: ['usuario_id', 'nome', 'role', 'cdl_id']
    }],
    order: [['data_cadastro', 'DESC']],
  });
}

async function buscarPorId(id) {
  const campanha = await Campanha.findByPk(id, {
    include: [{
      model: Usuario,
      as: 'empresa',
      attributes: ['usuario_id', 'nome', 'email', 'foto_perfil', 'role', 'cidade', 'estado', 'cdl_id'],
    }],
  });
  
  if (!campanha) {
    throw new Error(`Campanha com ID ${id} não encontrada`);
  }
  
  return campanha;
}

async function atualizar(id, dados) {
  const { titulo, descricao, imagem_base64, produtos, recompensas, data_inicio, data_fim, ativa } = dados;
  
  return sequelize.transaction(async (t) => {
    const campanha = await Campanha.findByPk(id, { transaction: t });
    
    if (!campanha) {
      throw new Error(`Campanha com ID ${id} não encontrada`);
    }
    
    const atualizacao = {};
    
    if (titulo !== undefined) atualizacao.titulo = titulo;
    if (descricao !== undefined) atualizacao.descricao = descricao;
    if (produtos !== undefined) atualizacao.produtos = Array.isArray(produtos) ? produtos : campanha.produtos;
    if (recompensas !== undefined) atualizacao.recompensas = Array.isArray(recompensas) ? recompensas : campanha.recompensas;
    if (data_inicio !== undefined) atualizacao.data_inicio = data_inicio;
    if (data_fim !== undefined) atualizacao.data_fim = data_fim;
    if (ativa !== undefined) atualizacao.ativa = ativa;
    
    if (imagem_base64 && imagem_base64.startsWith('data:image')) {
      if (campanha.imagem_url && campanha.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
        await imageUpload.deleteFromS3(campanha.imagem_url);
      }
      atualizacao.imagem_url = await imageUpload.uploadImageFromBase64(
        imagem_base64,
        'campanhas',
        OPCOES_IMAGEM_CAMPANHA
      );
    } else if (imagem_base64 === null) {
      if (campanha.imagem_url && campanha.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
        await imageUpload.deleteFromS3(campanha.imagem_url);
      }
      atualizacao.imagem_url = null;
    }
    
    await Campanha.update(atualizacao, { 
      where: { campanha_id: id },
      transaction: t 
    });
    
    return buscarPorId(id);
  });
}

async function excluir(id) {
  return sequelize.transaction(async (t) => {
    const campanha = await Campanha.findByPk(id, { transaction: t });
    
    if (!campanha) {
      throw new Error(`Campanha com ID ${id} não encontrada`);
    }
    
    if (campanha.imagem_url && campanha.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
      await imageUpload.deleteFromS3(campanha.imagem_url);
    }
    
    await Campanha.destroy({ 
      where: { campanha_id: id },
      transaction: t 
    });
    
    return true;
  });
}

module.exports = {
  criar,
  listarPorEmpresa,
  listarTodas,
  listarPorCdl,
  listarPorCliente,
  buscarPorId,
  atualizar,
  excluir,
};