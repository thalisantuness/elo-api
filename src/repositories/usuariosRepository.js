const { Usuario } = require('../model/Usuarios');
const { Regra } = require('../model/Regra');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const sequelize = require("../utils/db");
const s3 = require("../utils/awsConfig");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

// ==================== FUNÇÕES DE UPLOAD ====================

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
      foto_perfil
    }, { transaction: t });

    return usuarioCriado;
  });
}

async function buscarUsuarioPorId(id) {
  return Usuario.findByPk(id, {
    include: [
      {
        model: Regra,
        as: 'regra',
        required: false
      },
      {
        model: Usuario,
        as: 'cdl',
        attributes: ['usuario_id', 'nome', 'cidade', 'estado']
      },
      {
        model: Usuario,
        as: 'cdl_cliente',
        attributes: ['usuario_id', 'nome', 'cidade', 'estado']
      }
    ]
  });
}

async function buscarUsuarioPorEmail(email) {
  return Usuario.findOne({ 
    where: { email },
    include: [
      {
        model: Regra,
        as: 'regra',
        required: false
      },
      {
        model: Usuario,
        as: 'cdl',
        attributes: ['usuario_id', 'nome', 'cidade', 'estado']
      }
    ]
  });
}

async function atualizarUsuario(id, dados) {
  return Usuario.update(dados, {
    where: { usuario_id: id },
    returning: true,
  });
}

async function deletarUsuario(id) {
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

async function atualizarFotoPerfil(usuarioId, imageBase64) {
  return sequelize.transaction(async (t) => {
    const usuario = await Usuario.findByPk(usuarioId, { transaction: t });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const oldFileUrl = usuario.foto_perfil;
    if (oldFileUrl && oldFileUrl.includes(process.env.AWS_BUCKET_NAME)) {
      await deleteFromS3(oldFileUrl);
    }

    const newFileUrl = await uploadToS3(imageBase64, 'usuarios/perfil');

    usuario.foto_perfil = newFileUrl;
    await usuario.save({ transaction: t });

    const usuarioAtualizado = usuario.toJSON();
    delete usuarioAtualizado.senha;
    return usuarioAtualizado;
  });
}

// ==================== FUNÇÕES DE LISTAGEM COM FILTROS POR ROLE ====================

async function listarUsuariosComFiltros(usuarioLogado, filtros = {}) {
  const { role, usuario_id } = usuarioLogado;
  let whereClause = { ...filtros };

  // Aplicar filtros baseados na role
  switch (role) {
    case 'admin': // Cardial - vê tudo
      break;
      
    case 'cdl': // CDL - vê suas lojas e seus clientes
      whereClause[Op.or] = [
        { role: 'empresa', empresa_pai_id: usuario_id },
        { role: 'cliente', cdl_id: usuario_id },
        { role: 'empresa-funcionario', empresa_pai_id: usuario_id }
      ];
      break;
      
    case 'empresa': // Loja - vê seus clientes (que compraram nela)
      whereClause = {
        role: 'cliente',
        usuario_id: {
          [Op.in]: sequelize.literal(`(
            SELECT DISTINCT cliente_id FROM compras 
            WHERE empresa_id = ${usuario_id} AND cliente_id IS NOT NULL
          )`)
        }
      };
      break;
      
    case 'cliente': // Cliente - vê lojas da sua CDL
      const cliente = await Usuario.findByPk(usuario_id);
      if (cliente && cliente.cdl_id) {
        whereClause = {
          role: 'empresa',
          empresa_pai_id: cliente.cdl_id,
          status: 'ativo'
        };
      } else {
        whereClause = { usuario_id: -1 };
      }
      break;
      
    default:
      whereClause = { usuario_id: -1 };
  }

  return Usuario.findAll({ 
    where: whereClause,
    include: [{
      model: Regra,
      as: 'regra',
      required: false
    }],
    order: [['data_cadastro', 'DESC']]
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

// ==================== FUNÇÕES ESPECÍFICAS PARA CDL ====================

async function listarCdlsAtivas() {
  return Usuario.findAll({
    where: { 
      role: 'cdl',
      status: 'ativo'
    },
    attributes: ['usuario_id', 'nome', 'cidade', 'estado', 'foto_perfil', 'telefone', 'email'],
    order: [['nome', 'ASC']]
  });
}

async function listarLojasPorCdl(cdl_id, apenasAtivas = true) {
  const where = { 
    role: 'empresa',
    empresa_pai_id: cdl_id
  };
  
  if (apenasAtivas) {
    where.status = 'ativo';
  }
  
  return Usuario.findAll({
    where,
    attributes: ['usuario_id', 'nome', 'telefone', 'endereco', 'foto_perfil', 'cidade', 'status'],
    order: [['nome', 'ASC']]
  });
}

async function buscarCdlPorId(cdl_id) {
  return Usuario.findOne({
    where: { 
      usuario_id: cdl_id,
      role: 'cdl'
    },
    attributes: ['usuario_id', 'nome', 'cidade', 'estado', 'foto_perfil', 'telefone', 'email', 'cnpj']
  });
}

async function contarLojasDaCdl(cdl_id) {
  return Usuario.count({
    where: { 
      role: 'empresa',
      empresa_pai_id: cdl_id,
      status: 'ativo'
    }
  });
}

async function contarClientesDaCdl(cdl_id) {
  return Usuario.count({
    where: { 
      role: 'cliente',
      cdl_id: cdl_id
    }
  });
}

async function getDashboardCdl(cdl_id) {
  const [totalLojas, totalClientes, lojasRecentes] = await Promise.all([
    contarLojasDaCdl(cdl_id),
    contarClientesDaCdl(cdl_id),
    Usuario.findAll({
      where: { 
        role: 'empresa',
        empresa_pai_id: cdl_id
      },
      attributes: ['usuario_id', 'nome', 'status', 'data_cadastro', 'foto_perfil'],
      order: [['data_cadastro', 'DESC']],
      limit: 10
    })
  ]);
  
  return {
    cdl_id,
    totalLojas,
    totalClientes,
    lojasRecentes
  };
}

async function trocarCdlDoCliente(cliente_id, nova_cdl_id) {
  const cdl = await Usuario.findOne({
    where: { 
      usuario_id: nova_cdl_id,
      role: 'cdl',
      status: 'ativo'
    }
  });
  
  if (!cdl) {
    throw new Error('CDL não encontrada ou não está ativa');
  }
  
  await Usuario.update(
    { cdl_id: nova_cdl_id },
    { where: { usuario_id: cliente_id, role: 'cliente' } }
  );
  
  return buscarUsuarioPorId(cliente_id);
}

// ==================== FUNÇÕES ADMINISTRATIVAS ====================

async function tornarUsuarioAdmin(id) {
  const usuarioExistente = await Usuario.findByPk(id);
  if (!usuarioExistente) {
    throw new Error('Usuário não existe');
  }
  await Usuario.update({ role: 'admin', status: 'ativo' }, { where: { usuario_id: id } });
  return Usuario.findByPk(id);
}

async function tornarUsuarioCdl(id) {
  const usuarioExistente = await Usuario.findByPk(id);
  if (!usuarioExistente) {
    throw new Error('Usuário não existe');
  }
  await Usuario.update({ role: 'cdl', status: 'pendente' }, { where: { usuario_id: id } });
  return Usuario.findByPk(id);
}

async function aprovarCdl(id) {
  const usuarioExistente = await Usuario.findByPk(id);
  if (!usuarioExistente) {
    throw new Error('CDL não existe');
  }
  if (usuarioExistente.role !== 'cdl') {
    throw new Error('Usuário não é uma CDL');
  }
  await Usuario.update({ status: 'ativo' }, { where: { usuario_id: id } });
  return Usuario.findByPk(id);
}

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
      required: false
    },
    {
      model: Usuario,
      as: 'cdl',
      attributes: ['usuario_id', 'nome', 'cidade', 'estado']
    }],
    order: [['data_cadastro', 'DESC']]
  });
}

async function atualizarDadosEmpresa(usuario_id, dados) {
  const { cnpj, endereco, telefone, cidade, estado, modalidade_pontuacao, nome_regra, tipo, valor_minimo, pontos, multiplicador } = dados;
  const usuarioExistente = await Usuario.findByPk(usuario_id, { include: [{ model: Regra, as: 'regra' }] });
  
  if (!usuarioExistente) {
    throw new Error('Usuário não existe');
  }
  if (usuarioExistente.role !== 'empresa') {
    throw new Error('Usuário não é uma empresa');
  }

  const MODALIDADES_PONTUACAO = ['regras', '1pt_real_1pt_compra'];
  if (modalidade_pontuacao !== undefined && modalidade_pontuacao !== null && !MODALIDADES_PONTUACAO.includes(modalidade_pontuacao)) {
    throw new Error('Modalidade de pontuação inválida. Use: regras ou 1pt_real_1pt_compra');
  }

  const dadosBasicos = { cnpj, endereco, telefone, cidade, estado };
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

module.exports = {
  // Funções básicas
  criarUsuario,
  buscarUsuarioPorId,
  buscarUsuarioPorEmail,
  atualizarUsuario,
  deletarUsuario,
  atualizarPerfil,
  buscarUsuarioPorIdComSenha,
  atualizarFotoPerfil,
  listarUsuarios,
  listarUsuariosComFiltros,
  buscarIdsEmpresasFilhas,
  
  // Funções específicas CDL
  listarCdlsAtivas,
  listarLojasPorCdl,
  buscarCdlPorId,
  contarLojasDaCdl,
  contarClientesDaCdl,
  getDashboardCdl,
  trocarCdlDoCliente,
  
  // Funções administrativas
  listarEmpresas,
  tornarUsuarioAdmin,
  tornarUsuarioCdl,
  aprovarCdl,
  atualizarDadosEmpresa,
  givePoints,
};