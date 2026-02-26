const { Compra } = require('../model/Compra');
const { Usuario } = require('../model/Usuarios');
const { Campanha } = require('../model/Campanha');
const { SolicitacaoRecompensa } = require('../model/SolicitacaoRecompensa');
const { Recompensas } = require('../model/Recompensas');
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
      role: { [Op.in]: ['empresa', 'cdl', 'admin'] },
      status: 'ativo'
    }
  });
  
  if (!empresa) {
    throw new Error('Empresa/CDL não encontrada ou não está ativa');
  }
  
  // REGRA SIMPLIFICADA: 1 ponto por real gasto (arredondado para baixo)
  const pontos = Math.floor(Number(valor));
  
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

async function claimCompra(qr_code_data, cliente_id) {
  const transaction = await sequelize.transaction();
  
  try {
    const dados = JSON.parse(qr_code_data);
    const { qr_code_id, valor, empresa_id } = dados;

    // Verificar se o QR Code expirou
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
    const cliente = await Usuario.findOne({
      where: {
        usuario_id: cliente_id,
        role: 'cliente',
        status: 'ativo'
      },
      transaction
    });
    
    if (!cliente) {
      throw new Error('Cliente inválido ou não encontrado');
    }
    
    // Claim: Associar cliente e validar
    compra.cliente_id = cliente_id;
    compra.status = 'validada';
    compra.validado_em = new Date();
    compra.validado_por = cliente_id;
    await compra.save({ transaction });
    
    // Adicionar pontos ao cliente (regra padrão: 1 ponto por real)
    const pontosGanhos = compra.pontos_adquiridos;
    cliente.pontos += pontosGanhos;
    await cliente.save({ transaction });
    
    await transaction.commit();
    
    return {
      success: true,
      message: 'Compra claimada com sucesso! Pontos adicionados.',
      compra: {
        compra_id: compra.compra_id,
        valor: compra.valor,
        pontos_adquiridos: pontosGanhos,
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

async function getBigNumbers(role, userId) {
  // --- 1. Montar escopo de IDs por role ---
  let empresaIds = null;
  let cdlId = null;

  if (role === 'cdl') {
    cdlId = userId;
    const empresas = await Usuario.findAll({
      where: { role: 'empresa', cdl_id: userId },
      attributes: ['usuario_id']
    });
    empresaIds = empresas.map(e => e.usuario_id);
  } else if (role === 'empresa') {
    empresaIds = [userId];
  }

  // --- 2. Construir cláusulas WHERE reutilizáveis ---
  const compraValidadaWhere = { status: 'validada' };
  const compraCriadaWhere = {};

  if (role === 'empresa' || role === 'cdl') {
    const empresaFiltro = { [Op.in]: empresaIds.length ? empresaIds : [-1] };
    compraValidadaWhere.empresa_id = empresaFiltro;
    compraCriadaWhere.empresa_id = empresaFiltro;
  } else if (role === 'cliente') {
    compraValidadaWhere.cliente_id = userId;
    compraCriadaWhere.cliente_id = userId;
  }

  // Filtro de pontos usados (SolicitacaoRecompensa aceitas)
  const solicitacaoWhere = { status: 'aceita' };
  const recompensaWhere = {};
  if (role === 'empresa' || role === 'cdl') {
    recompensaWhere.usuario_id = { [Op.in]: empresaIds.length ? empresaIds : [-1] };
  } else if (role === 'cliente') {
    solicitacaoWhere.usuario_id = userId;
  }

  // Filtro de usuários por escopo
  const usuarioClienteWhere = { role: 'cliente' };
  const usuarioEmpresaWhere = { role: 'empresa', status: 'ativo' };
  if (role === 'cdl') {
    usuarioClienteWhere.cdl_id = userId;
    usuarioEmpresaWhere.cdl_id = userId;
  } else if (role === 'empresa') {
    usuarioClienteWhere.cdl_id = null; // empresa não tem escopo direto de clientes
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // --- 3. Executar todas as queries em paralelo ---
  const [
    comprasValidadasAgg,
    comprasCriadasAgg,
    totalComprasValidadas,
    pontosUsadosAgg,
    empresasAtivasNaSemana,
    totalEmpresasEscopo,
    totalClientes,
    totalEmpresas,
    totalCdls,
    velocidadeResult,
    densidadeResult
  ] = await Promise.all([
    // Valor escaneado + pontos gerados (compras validadas)
    Compra.findOne({
      where: compraValidadaWhere,
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('valor')), 0), 'valor_escaneadas'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('pontos_adquiridos')), 0), 'pontos_gerados']
      ],
      raw: true
    }),
    // Valor criado (todas as compras)
    Compra.findOne({
      where: compraCriadaWhere,
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('valor')), 0), 'valor_criadas']
      ],
      raw: true
    }),
    // Total de compras validadas (para ticket médio)
    Compra.count({ where: compraValidadaWhere }),
    // Pontos usados via SolicitacaoRecompensa aceitas
    SolicitacaoRecompensa.findOne({
      where: solicitacaoWhere,
      include: [{
        model: Recompensas,
        as: 'recompensa',
        attributes: [],
        where: Object.keys(recompensaWhere).length ? recompensaWhere : undefined,
        required: Object.keys(recompensaWhere).length > 0
      }],
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('recompensa.pontos')), 0), 'total_pontos_usados']
      ],
      raw: true
    }),
    // Empresas que fizeram pelo menos uma leitura nos últimos 7 dias
    Compra.count({
      where: { ...compraValidadaWhere, validado_em: { [Op.gte]: sevenDaysAgo } },
      distinct: true,
      col: 'empresa_id'
    }),
    // Total de empresas no escopo (para taxa de atividade)
    Usuario.count({ where: usuarioEmpresaWhere }),
    // Clientes cadastrados
    role === 'empresa' ? Promise.resolve(null) : Usuario.count({ where: usuarioClienteWhere }),
    // Empresas cadastradas
    role === 'empresa' ? Promise.resolve(1) : Usuario.count({ where: usuarioEmpresaWhere }),
    // CDLs cadastradas (só faz sentido para admin)
    role === 'admin' ? Usuario.count({ where: { role: 'cdl' } }) : Promise.resolve(null),
    // Velocidade de adoção: AVG dias entre 1ª e 2ª compra por cliente
    sequelize.query(`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (segunda - primeira)) / 86400)::numeric, 1) AS media_dias
      FROM (
        SELECT cliente_id,
               MIN(validado_em) AS primeira,
               MIN(CASE WHEN rn > 1 THEN validado_em END) AS segunda
        FROM (
          SELECT cliente_id, validado_em,
                 ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY validado_em) AS rn
          FROM compras
          WHERE status = 'validada'
            AND cliente_id IS NOT NULL
            ${role === 'empresa' || role === 'cdl' ? `AND empresa_id IN (${empresaIds.length ? empresaIds.join(',') : -1})` : ''}
            ${role === 'cliente' ? `AND cliente_id = ${userId}` : ''}
        ) ranked
        GROUP BY cliente_id
        HAVING COUNT(*) >= 2
      ) tempos
      WHERE segunda IS NOT NULL
    `, { type: sequelize.QueryTypes.SELECT }),
    // Densidade de rede: clientes que compraram em loja A e resgataram recompensa de loja B (A ≠ B)
    sequelize.query(`
      SELECT COUNT(DISTINCT c.cliente_id) AS quantidade
      FROM compras c
      JOIN solicitacao_recompensas sr ON c.cliente_id = sr.usuario_id
      JOIN recompensas r ON sr.recom_id = r.recom_id
      WHERE c.status = 'validada'
        AND sr.status = 'aceita'
        AND c.empresa_id <> r.usuario_id
        ${role === 'empresa' || role === 'cdl' ? `AND c.empresa_id IN (${empresaIds.length ? empresaIds.join(',') : -1})` : ''}
        ${role === 'cliente' ? `AND c.cliente_id = ${userId}` : ''}
    `, { type: sequelize.QueryTypes.SELECT })
  ]);

  // --- 4. Montar e retornar resultado ---
  const valorEscaneadas = parseFloat(comprasValidadasAgg?.valor_escaneadas) || 0;
  const pontosGerados = parseInt(comprasValidadasAgg?.pontos_gerados) || 0;
  const valorCriadas = parseFloat(comprasCriadasAgg?.valor_criadas) || 0;
  const pontosUsados = parseInt(pontosUsadosAgg?.total_pontos_usados) || 0;
  const totalCompras = totalComprasValidadas || 0;
  const taxaAtividade = totalEmpresasEscopo > 0
    ? parseFloat(((empresasAtivasNaSemana / totalEmpresasEscopo) * 100).toFixed(1))
    : 0;
  const clientesCadastrados = totalClientes ?? null;
  const empresasCadastradas = totalEmpresas ?? 0;
  const cdlsCadastradas = totalCdls ?? null;
  const totalUsuarios = (clientesCadastrados ?? 0) + empresasCadastradas;
  const ticketMedio = totalCompras > 0 ? parseFloat((valorEscaneadas / totalCompras).toFixed(2)) : 0;
  const velocidadeAdocao = parseFloat(velocidadeResult[0]?.media_dias) || null;
  const densidadeRede = parseInt(densidadeResult[0]?.quantidade) || 0;

  return {
    ircl: pontosUsados,
    taxa_atividade_associados: taxaAtividade,
    velocidade_adocao_dias: velocidadeAdocao,
    densidade_rede: densidadeRede,
    valor_em_compras_criadas: valorCriadas,
    valor_em_compras_escaneadas: valorEscaneadas,
    valor_em_pontos_gerados: pontosGerados,
    valor_em_pontos_usados: pontosUsados,
    clientes_cadastrados: clientesCadastrados,
    empresas_cadastradas: empresasCadastradas,
    cdls_cadastradas: cdlsCadastradas,
    total_usuarios: totalUsuarios,
    ticket_medio: ticketMedio
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
  getBigNumbers
};