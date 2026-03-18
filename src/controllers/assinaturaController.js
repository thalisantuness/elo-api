const { Assinatura } = require('../model/Assinatura');
const { Transacao } = require('../model/Transacao');
const { Usuario } = require('../model/Usuarios');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../utils/db');
const mercadoPagoService = require('../services/mercadoPagoService');
const logger = require('../services/logger');

class AssinaturaController {
  
  async criarAssinatura(req, res) {
    const timer = logger.timer('criar_assinatura');
    const requestId = uuidv4();
    
    try {
      const { plano, cardToken } = req.body;
      const usuario_id = req.user.usuario_id;

      logger.info('Iniciando criação de assinatura', {
        request_id: requestId,
        usuario_id,
        plano,
        role: req.user.role
      });

      // Verificar permissão
      if (req.user.role !== 'empresa') {
        logger.warn('Tentativa de assinatura por não-empresa', {
          request_id: requestId,
          usuario_id,
          role: req.user.role
        });
        
        return res.status(403).json({ 
          error: 'Apenas empresas podem ter assinaturas' 
        });
      }

      const usuario = await Usuario.findByPk(usuario_id);
      
      if (!usuario) {
        logger.error('Usuário não encontrado', {
          request_id: requestId,
          usuario_id
        });
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      logger.debug('Usuário encontrado', {
        request_id: requestId,
        usuario_nome: usuario.nome,
        usuario_email: usuario.email,
        plano_atual: usuario.plano_atual
      });

      // Calcular valor
      const valor = this.calcularValorPlano(plano);
      
      logger.debug('Valor calculado', {
        request_id: requestId,
        plano,
        valor
      });

      // Gerar código único
      const codigoTransacao = `CARD-${Date.now()}-${uuidv4().substring(0, 8)}`;

      // Processar pagamento
      const pagamento = await mercadoPagoService.processarPagamentoCartao({
        valor,
        descricao: `Assinatura ${plano} - ${usuario.nome}`,
        email: usuario.email,
        cardToken
      });

      logger.info('Pagamento processado', {
        request_id: requestId,
        payment_id: pagamento.id,
        status: pagamento.status,
        approved: pagamento.approved
      });

      // Salvar no banco com transação
      const result = await sequelize.transaction(async (t) => {
        logger.debug('Iniciando transação no banco', { request_id: requestId });

        // Criar assinatura
        const assinatura = await Assinatura.create({
          usuario_id,
          plano,
          status: pagamento.approved ? 'ativa' : 'pendente_pagamento',
          valor,
          data_inicio: pagamento.approved ? new Date() : null,
          data_fim: pagamento.approved ? this.calcularDataFim(plano) : null,
          mp_payment_id: pagamento.id
        }, { transaction: t });

        logger.debug('Assinatura criada', {
          request_id: requestId,
          assinatura_id: assinatura.assinatura_id,
          status: assinatura.status
        });

        // Criar transação
        const transacao = await Transacao.create({
          usuario_id,
          assinatura_id: assinatura.assinatura_id,
          codigo_transacao: codigoTransacao,
          status: pagamento.approved ? 'aprovada' : 'recusada',
          valor,
          dados_pagamento: pagamento,
          data_expiracao: new Date(Date.now() + 30 * 60000),
          data_confirmacao: pagamento.approved ? new Date() : null,
          mp_payment_id: pagamento.id
        }, { transaction: t });

        logger.debug('Transação criada', {
          request_id: requestId,
          transacao_id: transacao.transacao_id,
          status: transacao.status
        });

        // Se aprovado, atualizar limites da empresa
        if (pagamento.approved) {
          const limites = this.getLimitesPlano(plano);
          await usuario.update({
            plano_atual: this.mapearPlano(plano),
            status_assinatura: 'ativa',
            data_expiracao_plano: assinatura.data_fim,
            limite_produtos: limites.produtos,
            limite_usuarios: limites.usuarios,
            ultimo_pagamento: new Date()
          }, { transaction: t });

          logger.info('Limites do usuário atualizados', {
            request_id: requestId,
            usuario_id,
            novo_plano: usuario.plano_atual,
            limite_produtos: limites.produtos,
            limite_usuarios: limites.usuarios
          });
        }

        return { assinatura, transacao };
      });

      const duration = timer.end({ 
        success: true,
        approved: pagamento.approved 
      });

      logger.info('Assinatura finalizada com sucesso', {
        request_id: requestId,
        duration_ms: duration,
        assinatura_id: result.assinatura.assinatura_id,
        transacao_id: result.transacao.transacao_id,
        status: result.assinatura.status
      });

      // Métricas
      logger.metric('assinatura_criada', 1, {
        plano,
        status: result.assinatura.status,
        aprovado: pagamento.approved
      });

      return res.status(201).json({
        success: true,
        message: pagamento.approved ? 'Assinatura criada com sucesso' : 'Pagamento recusado',
        data: {
          assinatura: {
            id: result.assinatura.assinatura_id,
            plano: result.assinatura.plano,
            valor: result.assinatura.valor,
            status: result.assinatura.status
          },
          transacao: {
            id: result.transacao.transacao_id,
            codigo: result.transacao.codigo_transacao,
            status: result.transacao.status
          },
          pagamento: {
            id: pagamento.id,
            status: pagamento.status,
            aprovado: pagamento.approved
          }
        }
      });

    } catch (error) {
      const duration = timer.end({ error: true });
      
      logger.error('Erro ao criar assinatura', {
        request_id: requestId,
        error,
        duration_ms: duration,
        body: req.body,
        user: req.user?.usuario_id
      });

      // Métrica de erro
      logger.metric('assinatura_erro', 1, {
        tipo: error.name || 'unknown',
        codigo: error.status || 500
      });

      return res.status(500).json({ 
        error: 'Erro interno ao processar assinatura',
        details: error.message,
        request_id: requestId // Para rastreamento
      });
    }
  }

  async listarMinhasTransacoes(req, res) {
    const timer = logger.timer('listar_transacoes');
    const requestId = uuidv4();
    
    try {
      const { page = 1, limit = 20 } = req.query;
      const usuario_id = req.user.usuario_id;

      logger.info('Listando transações do usuário', {
        request_id: requestId,
        usuario_id,
        page,
        limit
      });

      const transacoes = await Transacao.findAndCountAll({
        where: { usuario_id },
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['created_at', 'DESC']],
        include: [{ model: Assinatura, as: 'assinatura' }]
      });

      const duration = timer.end({ 
        count: transacoes.count,
        page: parseInt(page)
      });

      logger.info('Transações listadas com sucesso', {
        request_id: requestId,
        total: transacoes.count,
        paginas: Math.ceil(transacoes.count / parseInt(limit)),
        duration_ms: duration
      });

      return res.json({
        success: true,
        data: {
          transacoes: transacoes.rows,
          total: transacoes.count,
          pagina: parseInt(page),
          total_paginas: Math.ceil(transacoes.count / parseInt(limit))
        }
      });

    } catch (error) {
      timer.end({ error: true });
      
      logger.error('Erro ao listar transações', {
        request_id: requestId,
        error,
        usuario_id: req.user?.usuario_id
      });
      
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  async buscarTransacao(req, res) {
    const timer = logger.timer('buscar_transacao');
    const requestId = uuidv4();
    
    try {
      const { id } = req.params;

      logger.info('Buscando transação por ID', {
        request_id: requestId,
        transacao_id: id,
        usuario_id: req.user?.usuario_id
      });

      const transacao = await Transacao.findByPk(id, {
        include: [
          { model: Usuario, as: 'empresa', attributes: ['nome', 'email'] },
          { model: Assinatura, as: 'assinatura' }
        ]
      });

      if (!transacao) {
        logger.warn('Transação não encontrada', {
          request_id: requestId,
          transacao_id: id
        });
        
        return res.status(404).json({ error: 'Transação não encontrada' });
      }

      // Verificar permissão
      if (req.user.role !== 'admin' && req.user.usuario_id !== transacao.usuario_id) {
        logger.warn('Acesso negado à transação', {
          request_id: requestId,
          transacao_id: id,
          usuario_id: req.user?.usuario_id,
          transacao_usuario_id: transacao.usuario_id
        });
        
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const duration = timer.end({ 
        transacao_id: id,
        status: transacao.status 
      });

      logger.info('Transação encontrada', {
        request_id: requestId,
        transacao_id: id,
        status: transacao.status,
        valor: transacao.valor,
        duration_ms: duration
      });

      return res.json({
        success: true,
        data: transacao
      });

    } catch (error) {
      timer.end({ error: true });
      
      logger.error('Erro ao buscar transação', {
        request_id: requestId,
        error,
        transacao_id: req.params.id
      });
      
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // ==================== NOVO MÉTODO ADICIONADO ====================
  async listarTodasTransacoes(req, res) {
    const timer = logger.timer('listar_todas_transacoes');
    const requestId = uuidv4();
    
    try {
      // Verificar se é admin
      if (req.user.role !== 'admin') {
        logger.warn('Tentativa de acesso não autorizado', {
          request_id: requestId,
          usuario_id: req.user?.usuario_id,
          role: req.user?.role
        });
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { page = 1, limit = 20, status } = req.query;

      logger.info('Listando todas transações (admin)', {
        request_id: requestId,
        page,
        limit,
        status: status || 'todos',
        admin_id: req.user?.usuario_id
      });

      const where = {};
      if (status) where.status = status;

      const transacoes = await Transacao.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['created_at', 'DESC']],
        include: [
          { model: Usuario, as: 'empresa', attributes: ['nome', 'email', 'usuario_id'] },
          { model: Assinatura, as: 'assinatura' }
        ]
      });

      const duration = timer.end({ 
        count: transacoes.count,
        page: parseInt(page)
      });

      logger.info('Transações listadas com sucesso (admin)', {
        request_id: requestId,
        total: transacoes.count,
        paginas: Math.ceil(transacoes.count / parseInt(limit)),
        duration_ms: duration
      });

      return res.json({
        success: true,
        data: {
          transacoes: transacoes.rows,
          total: transacoes.count,
          pagina: parseInt(page),
          total_paginas: Math.ceil(transacoes.count / parseInt(limit))
        }
      });

    } catch (error) {
      timer.end({ error: true });
      
      logger.error('Erro ao listar todas transações', {
        request_id: requestId,
        error,
        usuario_id: req.user?.usuario_id
      });
      
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // Métodos auxiliares
  calcularValorPlano(plano) {
    const precos = {
      mensal: 97.00,
      trimestral: 247.00,
      semestral: 447.00,
      anual: 797.00
    };
    return precos[plano] || 97.00;
  }

  calcularDataFim(plano) {
    const data = new Date();
    const periodos = {
      mensal: 30,
      trimestral: 90,
      semestral: 180,
      anual: 365
    };
    data.setDate(data.getDate() + periodos[plano]);
    return data;
  }

  getLimitesPlano(plano) {
    const limites = {
      mensal: { produtos: 50, usuarios: 3 },
      trimestral: { produtos: 100, usuarios: 5 },
      semestral: { produtos: 200, usuarios: 10 },
      anual: { produtos: 500, usuarios: 20 }
    };
    return limites[plano] || limites.mensal;
  }

  mapearPlano(plano) {
    const mapa = {
      mensal: 'basico',
      trimestral: 'profissional',
      semestral: 'profissional',
      anual: 'enterprise'
    };
    return mapa[plano] || 'basico';
  }
}

module.exports = new AssinaturaController();