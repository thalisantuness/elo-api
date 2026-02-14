const { Usuario } = require('../model/Usuarios');
const { Regra } = require('../model/Regra');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const sequelize = require("../utils/db");
const s3 = require("../utils/awsConfig");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

// ==================== FUNÇÕES DE UPLOAD (ADAPTADAS DO SEU OUTRO APP) ====================

async function deleteFromS3(fileUrl) {
  if (!fileUrl || !fileUrl.includes(process.env.AWS_BUCKET_NAME)) {
    console.log("URL inválida ou não pertence ao bucket. Nenhuma ação de exclusão tomada.");
    return;
  }
  try {
    const key = fileUrl.split('.com/')[1];
    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    }).promise();
    console.log(`Arquivo deletado do S3: ${key}`);
  } catch (error) {
    console.error("Erro ao deletar arquivo do S3:", error);
  }
}

// Helper para fazer upload de uma nova imagem para o S3
async function uploadToS3(base64Image, folder) {
  if (!base64Image || !base64Image.startsWith('data:image')) {
    throw new Error('Formato de imagem Base64 inválido');
  }
  try {
    const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
    const compressedBuffer = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const key = `${folder}/${uuidv4()}.jpg`;
    const uploadResult = await s3.upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: compressedBuffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read'
    }).promise();

    console.log(`Upload realizado com sucesso: ${uploadResult.Location}`);
    return uploadResult.Location;
  } catch (error) {
    console.error('Erro ao fazer upload para o S3:', error);
    throw new Error('Falha no upload da imagem');
  }
}

// ==================== FUNÇÕES DE USUÁRIO ====================

async function criarUsuario(dados) {
  const { usuario, fotoPerfilBase64 } = dados;
  const senhaHash = await bcrypt.hash(usuario.senha, 10);
  
  return sequelize.transaction(async (t) => {
    let foto_perfil = null;
    
    // FAZER UPLOAD DA FOTO SE FORNECIDA (igual ao seu outro app)
    if (fotoPerfilBase64 && fotoPerfilBase64.startsWith('data:image')) {
      try {
        foto_perfil = await uploadToS3(fotoPerfilBase64, 'usuarios/perfil');
        console.log('Foto de perfil enviada para S3:', foto_perfil);
      } catch (uploadError) {
        console.error('Erro no upload da foto:', uploadError);
        throw new Error(`Erro ao processar foto de perfil: ${uploadError.message}`);
      }
    }
    
    const usuarioCriado = await Usuario.create({
      ...usuario,
      senha: senhaHash,
      foto_perfil // AGORA VAI SALVAR A URL DO S3
    }, { transaction: t });

    return usuarioCriado;
  });
}

// Função para atualizar apenas a foto de perfil (adaptada do seu outro app)
async function atualizarFotoPerfil(usuarioId, imageBase64) {
  return sequelize.transaction(async (t) => {
    const usuario = await Usuario.findByPk(usuarioId, { transaction: t });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    // Deletar foto antiga do S3 se existir
    const oldFileUrl = usuario.foto_perfil;
    if (oldFileUrl && oldFileUrl.includes(process.env.AWS_BUCKET_NAME)) {
      await deleteFromS3(oldFileUrl);
    }

    // Upload da nova foto
    const newFileUrl = await uploadToS3(imageBase64, 'usuarios/perfil');

    usuario.foto_perfil = newFileUrl;
    await usuario.save({ transaction: t });

    const usuarioAtualizado = usuario.toJSON();
    delete usuarioAtualizado.senha;
    return usuarioAtualizado;
  });
}

// Outras funções existentes...
async function buscarUsuarioPorId(id) {
  return Usuario.findByPk(id, {
    include: [{
      model: Regra,
      as: 'regra',
      required: false
    }]
  });
}

async function buscarUsuarioPorEmail(email) {
  return Usuario.findOne({ 
    where: { email },
    include: [{
      model: Regra,
      as: 'regra',
      required: false
    }]
  });
}

async function atualizarUsuario(id, dados) {
  return Usuario.update(dados, {
    where: { usuario_id: id },
    returning: true,
  });
}

async function deletarUsuario(id) {
  // Antes de deletar, remover foto do S3 se existir
  const usuario = await Usuario.findByPk(id);
  if (usuario && usuario.foto_perfil && usuario.foto_perfil.includes(process.env.AWS_BUCKET_NAME)) {
    await deleteFromS3(usuario.foto_perfil);
  }
  return Usuario.destroy({ where: { usuario_id: id } });
}

async function atualizarPerfil(id, dadosPerfil) {
  const [updatedRows] = await Usuario.update(dadosPerfil, {
    where: { usuario_id: id },
    returning: true,
  });
  if (updatedRows > 0) {
    return Usuario.findByPk(id);
  }
  return null;
}

async function buscarUsuarioPorIdComSenha(id) {
  return Usuario.findOne({
    where: { usuario_id: id },
    attributes: { include: ['senha'] }
  });
}

async function listarUsuarios(filtros = {}) {
  return Usuario.findAll({ 
    where: filtros,
    include: [{
      model: Regra,
      as: 'regra',
      required: false
    }]
  });
}

async function buscarIdsEmpresasFilhas(empresaPaiId, visitados = new Set()) {
  if (visitados.has(empresaPaiId)) {
    return [];
  }
  visitados.add(empresaPaiId);
  
  const idsEmpresas = [empresaPaiId];
  
  const empresasFilhas = await Usuario.findAll({
    where: {
      role: 'empresa',
      empresa_pai_id: empresaPaiId
    },
    attributes: ['usuario_id']
  });
  
  for (const empresaFilha of empresasFilhas) {
    const empresasNetas = await buscarIdsEmpresasFilhas(empresaFilha.usuario_id, visitados);
    idsEmpresas.push(...empresasNetas);
  }
  
  return [...new Set(idsEmpresas)];
}

// Funções do novo repositório
async function listarEmpresas(whereClause = {}) {
  const defaultWhere = {
    role: 'empresa',
    status: 'ativo',
    ...whereClause
  };
  return Usuario.findAll({
    where: defaultWhere,
    include: [{
      model: Regra,
      as: 'regra',
      required: false,
      attributes: ['regra_id', 'nome', 'tipo', 'pontos', 'multiplicador']
    }],
    order: [['data_cadastro', 'DESC']]
  }).then(empresas => empresas.map(e => {
    if (e.regra) {
      const regra = e.regra;
      e.dataValues.descricao_regra = regra.tipo === 'por_compra' 
        ? `${regra.pontos} pontos por compra` 
        : `${regra.multiplicador} pontos por real gasto`;
    }
    return e;
  }));
}

async function tornarUsuarioAdmin(id) {
  const usuarioExistente = await Usuario.findByPk(id);
  if (!usuarioExistente) {
    throw new Error('Usuário não existe');
  }
  await Usuario.update({ role: 'admin' }, { where: { usuario_id: id } });
  return Usuario.findByPk(id);
}

async function tornarUsuarioEmpresa(id) {
  const usuarioExistente = await Usuario.findByPk(id);
  if (!usuarioExistente) {
    throw new Error('Usuário não existe');
  }
  await Usuario.update({ role: 'empresa', status: 'pendente' }, { where: { usuario_id: id } });
  return Usuario.findByPk(id);
}

async function aprovarEmpresa(id) {
  const usuarioExistente = await Usuario.findByPk(id);
  if (!usuarioExistente) {
    throw new Error('Empresa não existe');
  }
  if (usuarioExistente.role !== 'empresa') {
    throw new Error('Usuário não é uma empresa');
  }
  await Usuario.update({ status: 'ativo' }, { where: { usuario_id: id } });
  return Usuario.findByPk(id);
}

const MODALIDADES_PONTUACAO = ['regras', '1pt_real_1pt_compra'];

async function atualizarDadosEmpresa(usuario_id, dados) {
  const { cnpj, endereco, telefone, modalidade_pontuacao, nome_regra, tipo, valor_minimo, pontos, multiplicador } = dados;
  const usuarioExistente = await Usuario.findByPk(usuario_id, { include: [{ model: Regra, as: 'regra' }] });
  
  if (!usuarioExistente) {
    throw new Error('Usuário não existe');
  }
  if (usuarioExistente.role !== 'empresa') {
    throw new Error('Usuário não é uma empresa');
  }

  if (modalidade_pontuacao !== undefined && modalidade_pontuacao !== null && !MODALIDADES_PONTUACAO.includes(modalidade_pontuacao)) {
    throw new Error('Modalidade de pontuação inválida. Use: regras ou 1pt_real_1pt_compra');
  }

  const dadosBasicos = { cnpj, endereco, telefone };
  if (modalidade_pontuacao !== undefined) {
    dadosBasicos.modalidade_pontuacao = modalidade_pontuacao;
  }

  await Usuario.update(dadosBasicos, { where: { usuario_id } });

  if (nome_regra || tipo || pontos !== undefined || multiplicador !== undefined) {
    const regraData = {
      empresa_id: usuario_id,
      nome: nome_regra || 'Regra Padrão',
      tipo: tipo || 'por_compra',
      valor_minimo: valor_minimo || 0,
      pontos: pontos || 1,
      multiplicador: multiplicador || 1.0,
      ativa: true
    };

    let regra = usuarioExistente.regra;
    if (regra) {
      await Regra.update(regraData, { where: { regra_id: regra.regra_id } });
    } else {
      regra = await Regra.create(regraData);
      await Usuario.update({ regra_id: regra.regra_id }, { where: { usuario_id } });
    }
  }

  return Usuario.findByPk(usuario_id, { include: [{ model: Regra, as: 'regra' }] });
}

async function givePoints(id, pontos) {
  const usuarioExistente = await Usuario.findByPk(id);
  if (!usuarioExistente) {
    throw new Error('Usuário não encontrado');
  }
  usuarioExistente.pontos += pontos;
  await usuarioExistente.save();
  return usuarioExistente;
}

module.exports = {
  // Funções antigas
  criarUsuario,
  buscarUsuarioPorId,
  buscarUsuarioPorEmail,
  atualizarUsuario,
  deletarUsuario,
  atualizarPerfil,
  buscarUsuarioPorIdComSenha,
  atualizarFotoPerfil, // AGORA ESTÁ FUNCIONAL
  listarUsuarios,
  buscarIdsEmpresasFilhas,
  // Funções novas
  listarEmpresas,
  tornarUsuarioAdmin,
  tornarUsuarioEmpresa,
  aprovarEmpresa,
  atualizarDadosEmpresa,
  givePoints,
};