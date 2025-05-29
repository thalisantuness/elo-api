const { Usuario } = require('../model/Usuarios');
const { Motorista } = require('../model/Motorista');
const bcrypt = require('bcrypt');

async function listarUsuarios() {
  return Usuario.findAll({
    include: [
      { 
        model: Motorista, 
        as: 'motorista',
        attributes: { exclude: ['usuario_id'] } 
      }
    ]
  });
}

async function criarUsuarioComPerfil(dados) {
  const { usuario, dadosMotorista } = dados;

  // Validação básica
  if (!usuario.email || !usuario.senha) {
    throw new Error('Email e senha são obrigatórios');
  }

  // Verifica se usuário já existe
  const usuarioExistente = await Usuario.findOne({ where: { email: usuario.email } });
  if (usuarioExistente) {
    throw new Error('Email já cadastrado');
  }

  // Cria usuário com transaction para garantir atomicidade
  return sequelize.transaction(async (t) => {
    const usuarioCriado = await Usuario.create({
      email: usuario.email,
      senha: await bcrypt.hash(usuario.senha, 10),
      role: 'motorista', // Define role conforme necessário
      nome: dadosMotorista.nome // Nome pode vir do perfil
    }, { transaction: t });

    // Cria perfil de motorista
    await Motorista.create({
      usuario_id: usuarioCriado.usuario_id,
      ...dadosMotorista
    }, { transaction: t });

    return usuarioCriado;
  });
}

async function buscarUsuarioComPerfil(email) {
  return Usuario.findOne({ 
    where: { email },
    include: [
      { 
        model: Motorista, 
        as: 'motorista',
        include: [
          { model: ContaBancaria, as: 'conta_bancaria' },
          { model: ReferenciaPessoal, as: 'referencia-pessoal' }
        ]
      }
    ]
  });
}

module.exports = {
  listarUsuarios,
  criarUsuarioComPerfil,
  buscarUsuarioComPerfil
};