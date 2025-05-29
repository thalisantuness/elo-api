const { Photo } = require("../model/Photo");
const { Motorista } = require("../model/Motorista");

async function listarPhotos() {
  return await Photo.findAll({
    include: [
      { model: Motorista, as: "motorista", attributes: ["motorista_id", "nome"] },
    ],
    order: [["data_cadastro", "DESC"]],
  });
}

async function criarPhoto(dadosPhoto) {
  const { motorista_id, imageData } = dadosPhoto;

  const photo = await Photo.create({
    motorista_id,
    imageData,
  });

  return photo;
}

async function deletarPhoto(photo_id, motorista_id) {
  const photo = await Photo.findOne({ where: { photo_id, motorista_id } });

  if (!photo) {
    throw new Error("Foto não encontrada ou não pertence ao imóvel.");
  }

  await photo.destroy();
  return { message: "Foto excluída com sucesso!" };
}

module.exports = {
  listarPhotos,
  criarPhoto,
  deletarPhoto
};
