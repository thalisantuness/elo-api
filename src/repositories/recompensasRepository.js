const { Recompensas } = require('../model/Recompensas');

async function listarRecompensas(usuario_id) {
    return Recompensas.findAll({ where: { usuario_id } });
}

async function buscarRecompensaPorId(id) {
    const recompensa = await Recompensas.findByPk(id);
    if (!recompensa) {
        throw new Error(`Recompensa com ID ${id} não encontrada`);
    }
    return recompensa;
}

async function criarRecompensa(dadosRecompensa) {
    const { nome, pontos, estoque, usuario_id } = dadosRecompensa;
    if (!nome) {
        throw new Error('Nome da recompensa é obrigatório');
    }
    return Recompensas.create({
        nome,
        pontos: pontos || 0,
        estoque: estoque || 0,
        usuario_id,
    });
}

async function atualizarRecompensa(id, dadosAtualizados) {
    const recompensa = await buscarRecompensaPorId(id);
    await Recompensas.update(dadosAtualizados, {
        where: { recom_id: id },
    });
    return buscarRecompensaPorId(id);
}

async function excluirRecompensa(id) {
    const recompensa = await buscarRecompensaPorId(id);
    await Recompensas.destroy({ where: { recom_id: id } });
    return true;
}

module.exports = {
    listarRecompensas,
    buscarRecompensaPorId,
    criarRecompensa,
    atualizarRecompensa,
    excluirRecompensa,
};