const { Usuario } = require('../model/Usuarios');
const { Regra } = require('../model/Regra');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const sequelize = require("../utils/db");

// Funções do repositório antigo (para compatibilidade)
async function criarUsuario(dados) {
  const { usuario, fotoPerfilBase64 } = dados;
  const senhaHash = await bcrypt.hash(usuario.senha, 10);
  
  return sequelize.transaction(async (t) => {
    let foto_perfil = null;
    // Lógica de upload S3 pode ser adicionada depois
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