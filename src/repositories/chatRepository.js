const { Sequelize } = require("sequelize");
const { Usuario } = require("../model/Usuarios");
const { Conversa } = require("../model/Conversa");
const { Mensagem } = require("../model/Mensagem");
const { Frete } = require("../model/Frete");
const sequelize = require("../utils/db");

async function criarConversaSeNaoExistir(usuario1_id, usuario2_id, frete_id) {
  return await sequelize.transaction(async (t) => {
    let conversa = await Conversa.findOne({
      where: { frete_id },
      transaction: t,
    });

    if (!conversa) {
      const frete = await Frete.findOne({
        where: {
          frete_id,
          [Sequelize.Op.or]: [
            { empresa_id: usuario1_id, motorista_id: usuario2_id },
            { empresa_id: usuario2_id, motorista_id: usuario1_id },
          ],
        },
        transaction: t,
      });

      if (!frete) {
        throw new Error("Frete não encontrado ou usuários não vinculados");
      }

      conversa = await Conversa.create(
        {
          usuario1_id,
          usuario2_id,
          frete_id,
          ultima_mensagem: new Date(),
        },
        { transaction: t }
      );
    }

    return conversa;
  });
}

async function listarConversas(usuario_id) {
  return await Conversa.findAll({
    where: {
      [Sequelize.Op.or]: [{ usuario1_id: usuario_id }, { usuario2_id: usuario_id }],
    },
    include: [
      {
        model: Usuario,
        as: "Usuario1",
        attributes: ["usuario_id", "nome_completo", "imagem_perfil", "role"],
      },
      {
        model: Usuario,
        as: "Usuario2",
        attributes: ["usuario_id", "nome_completo", "imagem_perfil", "role"],
      },
      {
        model: Frete,
        as: "Frete",
        attributes: ["frete_id", "status"],
        include: [
          {
            association: "Empresa",
            attributes: ["usuario_id", "nome_completo"],
          },
          {
            association: "Motorista",
            attributes: ["usuario_id", "nome_completo"],
          },
        ],
      },
    ],
    order: [["ultima_mensagem", "DESC"]],
  });
}

async function listarMensagens(conversa_id, usuario_id) {
  const conversa = await Conversa.findOne({
    where: {
      conversa_id,
      [Sequelize.Op.or]: [{ usuario1_id: usuario_id }, { usuario2_id: usuario_id }],
    },
  });
  if (!conversa) {
    throw new Error("Conversa não encontrada ou acesso não autorizado");
  }
  return await Mensagem.findAll({
    where: { conversa_id },
    include: [
      {
        model: Usuario,
        as: "Remetente",
        attributes: ["usuario_id", "nome_completo", "email", "imagem_perfil", "role"],
      },
    ],
    order: [["data_envio", "ASC"]],
  });
}

async function marcarMensagemComoLida(mensagem_id, usuario_id) {
  const mensagem = await Mensagem.findOne({
    where: { mensagem_id },
    include: [
      {
        model: Conversa,
        where: {
          [Sequelize.Op.or]: [{ usuario1_id: usuario_id }, { usuario2_id: usuario_id }],
        },
      },
    ],
  });
  if (!mensagem) {
    throw new Error("Mensagem não encontrada ou acesso não autorizado");
  }
  return await mensagem.update({ lida: true });
}

module.exports = {
  listarConversas,
  listarMensagens,
  marcarMensagemComoLida,
  criarConversaSeNaoExistir,
};