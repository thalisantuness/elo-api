const { Assinatura } = require('../model/Assinatura');
const { Transacao } = require('../model/Transacao');
const { Usuario } = require('../model/Usuarios');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../utils/db');
const mercadoPagoService = require('../services/mercadoPagoService');

class AssinaturaController {
  
  // 1. CRIAR ASSINATURA COM CARTÃO
  async criarAssinatura(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { plano, cardToken } = req.body;
      const usuario_id = req.user.usuario_id;
      
      // Verificar se usuário é empresa
      if (req.user.role !== 'empresa') {
        return res.status(403).json({ 
          error: 'Apenas empresas podem ter assinaturas' 
        });
      }

      const usuario = await Usuario.findByPk(usuario_id);
      
      // Calcular valores do plano
      const valor = this.calcularValorPlano(plano);
      
      // Gerar código único
      const codigoTransacao = `CARD-${Date.now()}-${uuidv4().substring(0, 8)}`;

      // Processar pagamento
      const pagamento = await mercadoPagoService.processarPagamentoCartao({
        valor,
        descricao: `Assinatura ${plano} - ${usuario.nome}`,
        email: usuario.email,
        cardToken
      });

      // Criar assinatura
      const assinatura = await Assinatura.create({
        usuario_id,
        plano,
        status: pagamento.approved ? 'ativa' : 'pendente_pagamento',
        valor,
        data_inicio: pagamento.approved ? new Date() : null,
        data_fim: pagamento.approved ? this.calcularDataFim(plano) : null,
        mp_payment_id: pagamento.id
      }, { transaction });

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
      }, { transaction });

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
        }, { transaction });
      }

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: pagamento.approved ? 'Assinatura criada com sucesso' : 'Pagamento recusado',
        data: {
          assinatura: {
            id: assinatura.assinatura_id,
            plano: assinatura.plano,
            valor: assinatura.valor,
            status: assinatura.status
          },
          transacao: {
            id: transacao.transacao_id,
            codigo: transacao.codigo_transacao,
            status: transacao.status
          },
          pagamento: {
            id: pagamento.id,
            status: pagamento.status,
            aprovado: pagamento.approved
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erro ao criar assinatura:', error);
      return res.status(500).json({ 
        error: 'Erro interno ao processar assinatura',
        details: error.message 
      });
    }
  }

  // 2. LISTAR MINHAS TRANSAÇÕES
  async listarMinhasTransacoes(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const usuario_id = req.user.usuario_id;

      const transacoes = await Transacao.findAndCountAll({
        where: { usuario_id },
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['created_at', 'DESC']],
        include: [{ model: Assinatura, as: 'assinatura' }]
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
      console.error('Erro ao listar transações:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // 3. BUSCAR TRANSAÇÃO POR ID
  async buscarTransacao(req, res) {
    try {
      const { id } = req.params;

      const transacao = await Transacao.findByPk(id, {
        include: [
          { model: Usuario, as: 'empresa', attributes: ['nome', 'email'] },
          { model: Assinatura, as: 'assinatura' }
        ]
      });

      if (!transacao) {
        return res.status(404).json({ error: 'Transação não encontrada' });
      }

      // Verificar permissão
      if (req.user.role !== 'admin' && req.user.usuario_id !== transacao.usuario_id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      return res.json({
        success: true,
        data: transacao
      });

    } catch (error) {
      console.error('Erro ao buscar transação:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // 4. LISTAR TODAS TRANSAÇÕES (ADMIN)
  async listarTodasTransacoes(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { page = 1, limit = 20, status } = req.query;

      const where = {};
      if (status) where.status = status;

      const transacoes = await Transacao.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['created_at', 'DESC']],
        include: [
          { model: Usuario, as: 'empresa', attributes: ['nome', 'email'] },
          { model: Assinatura, as: 'assinatura' }
        ]
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
      console.error('Erro ao listar transações:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // MÉTODOS AUXILIARES
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