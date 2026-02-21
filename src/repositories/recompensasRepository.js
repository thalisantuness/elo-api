const { Recompensas } = require('../model/Recompensas');
const { Usuario } = require('../model/Usuarios');
const sequelize = require("../utils/db");
const imageUpload = require("../utils/imageUpload");
const { Op } = require("sequelize");

/** Opções de imagem para recompensas (500x500, quality 85). */
const OPCOES_IMAGEM_RECOMPENSA = { maxWidth: 500, maxHeight: 500, quality: 85 };

// ==================== FUNÇÕES DE RECOMPENSA ====================

/**
 * Lista recompensas com filtro baseado no role do usuário logado.
 * - admin: todas
 * - empresa: as próprias
 * - empresa-funcionario: as da empresa pai (cdl_id do funcionario)
 * - cliente: as de todas as empresas da mesma CDL do cliente
 */
async function listarRecompensas(usuario_id, role) {
  let whereClause = {};

  if (role === 'admin') {
    // sem filtro
  } else if (role === 'empresa' || role === 'cdl') {
    whereClause.usuario_id = usuario_id;
  } else if (role === 'empresa-funcionario') {
    const funcionario = await Usuario.findByPk(usuario_id);
    if (funcionario && funcionario.cdl_id) {
      whereClause.usuario_id = funcionario.cdl_id;
    } else {
      return [];
    }
  } else if (role === 'cliente') {
    const cliente = await Usuario.findByPk(usuario_id);
    if (cliente && cliente.cdl_id) {
      whereClause.usuario_id = {
        [Op.in]: sequelize.literal(`(
          SELECT usuario_id FROM usuarios
          WHERE cdl_id = ${cliente.cdl_id} AND role = 'empresa' AND status = 'ativo'
        )`)
      };
    } else {
      return [];
    }
  } else {
    throw new Error('Role não autorizado para visualizar recompensas');
  }

  return Recompensas.findAll({
    where: whereClause,
    order: [['data_cadastro', 'DESC']]
  });
}

async function buscarRecompensaPorId(id) {
    const recompensa = await Recompensas.findByPk(id);
    if (!recompensa) {
        throw new Error(`Recompensa com ID ${id} não encontrada`);
    }
    return recompensa;
}

async function criarRecompensa(dadosRecompensa) {
    const { nome, descricao, imagem_base64, pontos, estoque, usuario_id } = dadosRecompensa;
    
    if (!nome) {
        throw new Error('Nome da recompensa é obrigatório');
    }

    return sequelize.transaction(async (t) => {
      let imagem_url = null;
      
      // Fazer upload da imagem se fornecida (igual ao usuário)
      if (imagem_base64 && imagem_base64.startsWith('data:image')) {
        try {
          imagem_url = await imageUpload.uploadImageFromBase64(
            imagem_base64,
            'recompensas',
            OPCOES_IMAGEM_RECOMPENSA
          );
        } catch (uploadError) {
          console.error('Erro no upload da imagem:', uploadError);
          throw new Error(`Erro ao processar imagem da recompensa: ${uploadError.message}`);
        }
      }

      return Recompensas.create({
          nome,
          descricao: descricao || null,
          imagem_url,
          pontos: pontos || 0,
          estoque: estoque || 0,
          usuario_id,
      }, { transaction: t });
    });
}

async function atualizarRecompensa(id, dadosAtualizados) {
    const { nome, descricao, imagem_base64, pontos, estoque } = dadosAtualizados;
    
    return sequelize.transaction(async (t) => {
      const recompensa = await Recompensas.findByPk(id, { transaction: t });
      
      if (!recompensa) {
          throw new Error(`Recompensa com ID ${id} não encontrada`);
      }
      
      const atualizacao = {};
      
      if (nome !== undefined) atualizacao.nome = nome;
      if (descricao !== undefined) atualizacao.descricao = descricao;
      if (pontos !== undefined) atualizacao.pontos = pontos;
      if (estoque !== undefined) atualizacao.estoque = estoque;
      
      // Processar nova imagem se fornecida (igual ao usuário)
      if (imagem_base64 && imagem_base64.startsWith('data:image')) {
        if (recompensa.imagem_url && recompensa.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
          await imageUpload.deleteFromS3(recompensa.imagem_url);
        }
        atualizacao.imagem_url = await imageUpload.uploadImageFromBase64(
          imagem_base64,
          'recompensas',
          OPCOES_IMAGEM_RECOMPENSA
        );
      } else if (imagem_base64 === null) {
        if (recompensa.imagem_url && recompensa.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
          await imageUpload.deleteFromS3(recompensa.imagem_url);
        }
        atualizacao.imagem_url = null;
      }
      
      await Recompensas.update(atualizacao, {
          where: { recom_id: id },
          transaction: t
      });
      
      return buscarRecompensaPorId(id);
    });
}

async function excluirRecompensa(id) {
    return sequelize.transaction(async (t) => {
      const recompensa = await Recompensas.findByPk(id, { transaction: t });
      
      if (!recompensa) {
          throw new Error(`Recompensa com ID ${id} não encontrada`);
      }
      
      // Deletar imagem do S3 se existir (igual ao usuário)
      if (recompensa.imagem_url && recompensa.imagem_url.includes(process.env.AWS_BUCKET_NAME)) {
          await imageUpload.deleteFromS3(recompensa.imagem_url);
      }
      
      await Recompensas.destroy({ 
          where: { recom_id: id },
          transaction: t 
      });
      
      return true;
    });
}

module.exports = {
    listarRecompensas,
    buscarRecompensaPorId,
    criarRecompensa,
    atualizarRecompensa,
    excluirRecompensa,
};