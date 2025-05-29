const { Motorista } = require("../model/Motorista");
const { Estado } = require("../model/Estado");
const { Tipo } = require("../model/Tipo");
const { Photo } = require("../model/Photo");
const { Cidade } = require("../model/Cidade");

async function listarMotorista(filtros = {}) {
  return await Motorista.findAll({
    where: filtros,
    include: [
      { model: Estado, as: "estado", attributes: ["estado_id", "nome"] },
      { model: Cidade, as: "cidade", attributes: ["cidade_id", "nome"] },
      { model: Tipo, as: "tipo", attributes: ["tipo_id", "nome"] },
      { model: Photo, as: "photos", attributes: ["photo_id", "imageData"] },
    ],
  });
}

async function buscarMotoristaPorId(id) {
  const motorista = await Motorista.findByPk(id, {
    include: [
      { model: Estado, as: "estado", attributes: ["estado_id", "nome"] },
      { model: Cidade, as: "cidade", attributes: ["cidade_id", "nome"] },
      { model: Tipo, as: "tipo", attributes: ["tipo_id", "nome"] },
      { model: Photo, as: "photos", attributes: ["photo_id", "imageData"] },
    ],
  });

  if (!motorista) {
    throw new Error("Imóvel não encontrado");
  }

  return motorista;
}

async function criarMotorista(dadosMotorista) {
  return await Motorista.create(dadosMotorista);
}

async function atualizarMotorista(id, dadosAtualizados) {
  const motorista = await Motorista.findByPk(id);

  if (!motorista) {
    throw new Error("Imóvel não encontrado");
  }

  await motorista.update(dadosAtualizados);
  return motorista;
}

async function buscarImagensPorMotoristaId(motoristaId) {
  return await Photo.findAll({
    where: { motorista_id: motoristaId },
    attributes: ["photo_id", "imageData"],
  });
}

async function deletarImagem(photoId) {
  const imagem = await Photo.findByPk(photoId);

  if (!imagem) {
    throw new Error("Imagem não encontrada");
  }

  await imagem.destroy();
  return { message: "Imagem deletada com sucesso" };
}

async function deletarMotorista(id) {
  const motorista = await Motorista.findByPk(id, {
    include: [{ model: Photo, as: "photos" }],
  });

  if (!motorista) {
    throw new Error("Imóvel não encontrado");
  }

  if (motorista.photos.length > 0) {
    await Photo.destroy({ where: { motorista_id: id } });
  }

  await motorista.destroy();
  return { message: "Imóvel deletado com sucesso" };
}

module.exports = {
  listarMotorista,
  criarMotorista,
  buscarMotoristaPorId,
  atualizarMotorista,
  deletarMotorista,
  buscarImagensPorMotoristaId,
  deletarImagem,
};
