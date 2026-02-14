const { Compra } = require('../model/Compra');
const { Usuario } = require('../model/Usuarios');
const { Regra } = require('../model/Regra');
const { Campanha } = require('../model/Campanha');
const { Op } = require('sequelize');
const sequelize = require('../utils/db');
const crypto = require('crypto');

async function listarCompras(whereFilters = {}) {
  return Compra.findAll({
    where: whereFilters,
    include: [
      {
        model: Usuario,
        as: 'cliente',
        attributes: ['usuario_id', 'nome', 'email', 'pontos']
      },
      {
        model: Usuario,
        as: 'empresa',
        attributes: ['usuario_id', 'nome', 'email']
      },
      {
        model: Campanha,
        as: 'campanha',
        attributes: ['campanha_id', 'titulo']
      }
    ],
    order: [['data_cadastro', 'DESC']]
  });
}

async function listarComprasPorEmpresa(empresa_id, status = null) {
  const where = { empresa_id };
  if (status) where.status = status;
  return Compra.findAll({
    where,
    include: [
      {
        model: Usuario,
        as: 'cliente',
        attributes: ['usuario_id', 'nome', 'email', 'pontos']
      },
      {
        model: Campanha,
        as: 'campanha',
        attributes: ['campanha_id', 'titulo']
      }
    ],
    order: [['data_cadastro', 'DESC']]
  });
}

async function listarComprasPorCliente(cliente_id) {
  return Compra.findAll({
    where: { cliente_id },
    include: [
      {
        model: Usuario,
        as: 'empresa',
        attributes: ['usuario_id', 'nome', 'email']
      },
      {
        model: Campanha,
        as: 'campanha',
        attributes: ['campanha_id', 'titulo']
      }
    ],
    order: [['data_cadastro', 'DESC']]
  });
}

async function buscarCompraPorId(id, usuario_id, role) {
  const compra = await Compra.findOne({
    where: { compra_id: id },
    include: [
      {
        model: Usuario,
        as: 'cliente',
        attributes: ['usuario_id', 'nome', 'email', 'pontos']
      },
      {
        model: Usuario,
        as: 'empresa',
        attributes: ['usuario_id', 'nome', 'email']
      },
      {
        model: Campanha,
        as: 'campanha',
        attributes: ['campanha_id', 'titulo']
      }
    ]
  });
  
  if (!compra) {
    throw new Error(`Compra com ID ${id} não encontrada`);
  }
  
  // Verificar permissões
  if (role === 'cliente' && compra.cliente_id !== usuario_id) {
    throw new Error('Você não tem permissão para ver esta compra');
  }
  if (role === 'empresa' && compra.empresa_id !== usuario_id) {
    throw new Error('Você não tem permissão para ver esta compra');
  }
  
  return compra;
}

async function criarCompra(dadosCompra) {
  const { cliente_id, empresa_id, valor, campanha_id } = dadosCompra;
  
  // Verificar se empresa existe e está ativa
  const empresa = await Usuario.findOne({
    where: {
      usuario_id: empresa_id,
      role: 'empresa',
      status: 'ativo'
    }
  });
  
  if (!empresa) {
    throw new Error('Empresa não encontrada ou não está ativa');
  }
  
  // Se cliente_id fornecido, verificar cliente
  if (cliente_id) {
    const cliente = await Usuario.findByPk(cliente_id);
    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }
    if (cliente.role !== 'cliente') {
      throw new Error('Usuário não é um cliente válido');
    }
  }
  
  // Se campanha_id fornecido, verificar campanha
  if (campanha_id) {
    const campanha = await Campanha.findOne({
      where: {
        campanha_id,
        empresa_id,
        ativa: true,
        data_inicio: { [Op.lte]: new Date() },
        data_fim: { [Op.gte]: new Date() }
      }
    });
    if (!campanha) {
      throw new Error('Campanha não encontrada, não pertence à empresa ou não está ativa no período');
    }
  }
  
  // Calcular pontos
  const pontos = await calcularPontos(empresa_id, valor, campanha_id);
  
  // Gerar ID único para o QR Code
  const qr_code_id = crypto.randomBytes(16).toString('hex');
  
  // Criar dados básicos do QR Code
  const qrPayload = {
    qr_code_id,
    empresa_id,
    valor,
    campanha_id: campanha_id || null,
    timestamp: Date.now(),
    expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutos
  };
  
  // Criar compra
  const compra = await Compra.create({
    qr_code_id,
    cliente_id: cliente_id || null,
    empresa_id,
    campanha_id: campanha_id || null,
    valor,
    pontos_adquiridos: pontos,
    status: 'pendente',
    qr_code_data: JSON.stringify(qrPayload),
    qr_code_expira_em: new Date(qrPayload.expiresAt)
  });
  
  return compra;
}

async function calcularPontos(empresa_id, valor, campanha_id = null) {
  let pontos = 0;
  
  // Buscar empresa para ver modalidade
  const empresa = await Usuario.findByPk(empresa_id);
  
  if (empresa.modalidade_pontuacao === '1pt_real_1pt_compra') {
    pontos = Math.floor(Number(valor)) + 1;
  } else {
    // Buscar regras ativas da empresa
    const regras = await Regra.findAll({
      where: {
        empresa_id,
        ativa: true
      }
    });
    
    for (const regra of regras) {
      if (regra.tipo === 'por_compra') {
        pontos += regra.pontos;
      } else if (regra.tipo === 'por_valor' && valor >= regra.valor_minimo) {
        pontos += Math.floor(valor * regra.multiplicador);
      }
    }
  }
  
  // Se tiver campanha, verificar se há bônus
  if (campanha_id) {
    const campanha = await Campanha.findByPk(campanha_id);
    if (campanha && campanha.recompensas && campanha.recompensas.length > 0) {
      // Lógica de bônus da campanha (pode ser personalizada)
      pontos += Math.floor(pontos * 0.1); // Exemplo: 10% de bônus
    }
  }
  
  return pontos;
}

async function claimCompra(qr_code_data, cliente_id) {
  const transaction = await sequelize.transaction();
  
  try {
    const dados = JSON.parse(qr_code_data);
    const { qr_code_id, valor, empresa_id } = dados;

    if (Date.now() > dados.expiresAt) {
      throw new Error('QR Code expirado');
    }

    // Buscar compra pendente sem cliente
    const compra = await Compra.findOne({
      where: {
        qr_code_id,
        status: 'pendente',
        cliente_id: null
      },
      transaction
    });
    
    if (!compra) {
      throw new Error('Compra não encontrada, já claimada ou inválida');
    }
    
    // Verificar valor
    if (parseFloat(compra.valor) !== parseFloat(valor)) {
      throw new Error('Valor da compra não corresponde');
    }
    
    // Verificar se o cliente existe
    const cliente = await Usuario.findByPk(cliente_id, { transaction });
    if (!cliente || cliente.role !== 'cliente') {
      throw new Error('Cliente inválido');
    }
    
    // Claim: Associar cliente e validar
    compra.cliente_id = cliente_id;
    compra.status = 'validada';
    compra.validado_em = new Date();
    compra.validado_por = cliente_id;
    await compra.save({ transaction });
    
    // Adicionar pontos ao cliente
    cliente.pontos += compra.pontos_adquiridos;
    await cliente.save({ transaction });
    
    await transaction.commit();
    
    return {
      success: true,
      message: 'Compra claimada com sucesso! Pontos adicionados.',
      compra: {
        compra_id: compra.compra_id,
        valor: compra.valor,
        pontos_adquiridos: compra.pontos_adquiridos,
        cliente_novo_saldo: cliente.pontos
      }
    };
  } catch (error) {
    await transaction.rollback();
    console.error('Erro no claimCompra:', error);
    throw error;
  }
}

async function atualizarCompra(id, dadosAtualizados, usuario_id, role) {
  const compra = await buscarCompraPorId(id, usuario_id, role);
  
  // Empresas só podem atualizar compras pendentes que são delas
  if (role === 'empresa' && compra.empresa_id !== usuario_id) {
    throw new Error('Você só pode atualizar compras da sua empresa');
  }
  
  // Clientes não podem atualizar compras
  if (role === 'cliente') {
    throw new Error('Clientes não podem atualizar compras');
  }
  
  // Não permitir atualizar campos críticos
  delete dadosAtualizados.compra_id;
  delete dadosAtualizados.qr_code_id;
  delete dadosAtualizados.cliente_id;
  delete dadosAtualizados.empresa_id;
  delete dadosAtualizados.pontos_adquiridos;
  
  await Compra.update(dadosAtualizados, {
    where: { compra_id: id },
  });
  
  return buscarCompraPorId(id, usuario_id, role);
}

async function excluirCompra(id, usuario_id, role) {
  const compra = await buscarCompraPorId(id, usuario_id, role);
  
  // Apenas admin pode excluir compras
  if (role !== 'admin') {
    throw new Error('Apenas administradores podem excluir compras');
  }
  
  await Compra.destroy({ where: { compra_id: id } });
}

async function estatisticasEmpresa(empresa_id) {
  const compras = await Compra.findAll({
    where: { empresa_id, status: 'validada' },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('compra_id')), 'total_compras'],
      [sequelize.fn('SUM', sequelize.col('valor')), 'total_vendido'],
      [sequelize.fn('SUM', sequelize.col('pontos_adquiridos')), 'total_pontos_distribuidos']
    ]
  });
  
  const clientesUnicos = await Compra.count({
    where: { empresa_id, status: 'validada' },
    distinct: true,
    col: 'cliente_id'
  });
  
  const comprasPorMes = await Compra.findAll({
    where: { empresa_id, status: 'validada' },
    attributes: [
      [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('data_cadastro')), 'mes'],
      [sequelize.fn('COUNT', sequelize.col('compra_id')), 'total_compras'],
      [sequelize.fn('SUM', sequelize.col('valor')), 'total_vendido']
    ],
    group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('data_cadastro'))],
    order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('data_cadastro')), 'DESC']],
    limit: 6
  });
  
  return {
    total_compras: parseInt(compras[0]?.dataValues.total_compras) || 0,
    total_vendido: parseFloat(compras[0]?.dataValues.total_vendido) || 0,
    total_pontos_distribuidos: parseInt(compras[0]?.dataValues.total_pontos_distribuidos) || 0,
    clientes_unicos: clientesUnicos || 0,
    compras_por_mes: comprasPorMes.map(item => ({
      mes: item.dataValues.mes,
      total_compras: parseInt(item.dataValues.total_compras),
      total_vendido: parseFloat(item.dataValues.total_vendido)
    }))
  };
}

module.exports = {
  listarCompras,
  listarComprasPorEmpresa,
  listarComprasPorCliente,
  buscarCompraPorId,
  criarCompra,
  claimCompra,
  atualizarCompra,
  excluirCompra,
  estatisticasEmpresa,
  calcularPontos
};