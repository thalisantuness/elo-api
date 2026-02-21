const { Usuario } = require('../model/Usuarios');
const { Regra } = require('../model/Regra');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const sequelize = require("../utils/db");
const imageUpload = require("../utils/imageUpload");

// ==================== FUNÇÕES DE USUÁRIO ====================

async function criarUsuario(dados) {
  const { usuario, fotoPerfilBase64 } = dados;
  const senhaHash = await bcrypt.hash(usuario.senha, 10);
  
  return sequelize.transaction(async (t) => {
    let foto_perfil = null;
    
    if (fotoPerfilBase64 && fotoPerfilBase64.startsWith('data:image')) {
      try {
        foto_perfil = await imageUpload.uploadImageFromBase64(fotoPerfilBase64, 'usuarios/perfil');
      } catch (uploadError) {
        console.error('Erro no upload da foto:', uploadError);
        throw new Error(`Erro ao processar foto de perfil: ${uploadError.message}`);
      }
    }
    
    const usuarioParaCriar = {
      nome: usuario.nome,
      telefone: usuario.telefone,
      email: usuario.email,
      senha: senhaHash,
      role: usuario.role,
      cliente_endereco: usuario.cliente_endereco,
      cidade: usuario.cidade,
      estado: usuario.estado,
      cdl_id: usuario.cdl_id,
      status: usuario.status,
      pontos: usuario.pontos || 0,
      cnpj: usuario.cnpj,
      modalidade_pontuacao: usuario.modalidade_pontuacao || 'regras',
      foto_perfil
    };

    const usuarioCriado = await Usuario.create(usuarioParaCriar, { transaction: t });

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
    await imageUpload.deleteFromS3(usuario.foto_perfil);
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
      await imageUpload.deleteFromS3(oldFileUrl);
    }

    const newFileUrl = await imageUpload.uploadImageFromBase64(imageBase64, 'usuarios/perfil');

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

  switch (role) {
    case 'admin':
      break;
      
    case 'cdl': {
      const empresasDaCdl = await Usuario.findAll({
        where: { role: 'empresa', cdl_id: usuario_id },
        attributes: ['usuario_id']
      });
      const idsEmpresas = empresasDaCdl.map(e => e.usuario_id);

      const condicoesCdl = [
        { role: 'empresa', cdl_id: usuario_id },
        { role: 'cliente', cdl_id: usuario_id },
      ];

      if (idsEmpresas.length > 0) {
        condicoesCdl.push({ role: 'empresa-funcionario', cdl_id: { [Op.in]: idsEmpresas } });
      }

      whereClause[Op.or] = condicoesCdl;
      break;
    }
      
    case 'empresa':
      whereClause = {
        [Op.or]: [
          { role: 'cliente', cdl_id: usuario_id },
          {
            role: 'cliente',
            usuario_id: {
              [Op.in]: sequelize.literal(`(
                SELECT DISTINCT cliente_id FROM compras
                WHERE empresa_id = ${usuario_id} AND cliente_id IS NOT NULL
              )`)
            }
          },
          { role: 'empresa-funcionario', cdl_id: usuario_id }
        ]
      };
      break;
      
    case 'cliente':
      const cliente = await Usuario.findByPk(usuario_id);
      if (cliente && cliente.cdl_id) {
        whereClause = {
          role: 'empresa',
          cdl_id: cliente.cdl_id,
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
    cdl_id: cdl_id
  };
  
  if (apenasAtivas) {
    where.status = 'ativo';
  }
  
  return Usuario.findAll({
    where,
    attributes: ['usuario_id', 'nome', 'telefone', 'foto_perfil', 'cidade', 'status'],
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
      cdl_id: cdl_id,
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
        cdl_id: cdl_id
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
  const { cnpj, telefone, cidade, estado, modalidade_pontuacao, nome_regra, tipo, valor_minimo, pontos, multiplicador } = dados;
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

  const dadosBasicos = { cnpj, telefone, cidade, estado };
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
      cdl_id: empresaPaiId
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
  listarCdlsAtivas,
  listarLojasPorCdl,
  buscarCdlPorId,
  contarLojasDaCdl,
  contarClientesDaCdl,
  getDashboardCdl,
  trocarCdlDoCliente,
  listarEmpresas,
  tornarUsuarioAdmin,
  tornarUsuarioCdl,
  aprovarCdl,
  atualizarDadosEmpresa,
  givePoints,
};