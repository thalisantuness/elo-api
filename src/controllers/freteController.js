const freteRepository = require("../repositories/freteRepository");
const { Usuario } = require("../model/Usuarios");
const { Sequelize } = require("sequelize");
const { Frete } = require("../model/Frete");

function FreteController() {
  async function criar(req, res) {
    try {
      const { empresa_id, data_prevista_entrega } = req.body;
      const usuarioLogadoId = req.user.usuario_id;

      if (!empresa_id) {
        return res.status(400).json({ error: "Empresa é obrigatória" });
      }

      const empresa = await Usuario.findOne({
        where: { usuario_id: empresa_id, role: "empresa" },
      });

      if (!empresa) {
        return res.status(400).json({ error: "Empresa inválida" });
      }

      if (req.user.role !== "empresa" || usuarioLogadoId !== empresa_id) {
        return res.status(403).json({ error: "Não autorizado" });
      }

      const frete = await freteRepository.criarFrete({
        empresa_id,
        data_prevista_entrega,
        motorista_id: null,
        status: "anunciado",
      });

      res.status(201).json(frete);
    } catch (error) {
      console.error("Erro ao criar frete:", error);
      res.status(500).json({ error: "Erro ao criar frete" });
    }
  }

  async function listar(req, res) {
    try {
      const usuario_id = req.user.usuario_id;
      const role = req.user.role;

      let fretes;

      if (role === "motorista") {
        fretes = await Frete.findAll({
          where: {
            status: "anunciado",
            empresa_id: { [Sequelize.Op.ne]: usuario_id },
          },
          include: [
            {
              association: "Empresa",
              attributes: ["usuario_id", "nome_completo", "imagem_perfil"],
            },
          ],
          order: [["data_criacao", "DESC"]],
        });
      } else {
        fretes = await freteRepository.listarFretesPorUsuario(usuario_id);
      }

      res.json(fretes);
    } catch (error) {
      console.error("Erro ao listar fretes:", error);
      res.status(500).json({ error: "Erro ao listar fretes" });
    }
  }

  async function buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const usuario_id = req.user.usuario_id;
      const role = req.user.role;

      const frete = await freteRepository.buscarFretePorId(id);

      if (!frete) {
        return res.status(404).json({ error: "Frete não encontrado" });
      }

      if (role === "motorista") {
        if (
          frete.status === "anunciado" ||
          (frete.status === "em_andamento" && frete.motorista_id === usuario_id)
        ) {
          return res.json(frete);
        }
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      if (frete.empresa_id !== usuario_id) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      res.json(frete);
    } catch (error) {
      console.error("Erro ao buscar frete:", error);
      res.status(500).json({ error: "Erro ao buscar frete" });
    }
  }

  async function atualizar(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const usuario_id = req.user.usuario_id;
    const role = req.user.role;

    // Validar se o status é válido
    const statusValidos = ["anunciado", "em_andamento", "finalizado", "cancelado"];
    if (status && !statusValidos.includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    // Buscar o frete
    const frete = await freteRepository.buscarFretePorId(id);
    if (!frete) {
      return res.status(404).json({ error: "Frete não encontrado" });
    }

    // Verificar permissões - apenas a empresa dona pode atualizar
    if (frete.empresa_id !== usuario_id) {
      return res.status(403).json({ error: "Acesso não autorizado" });
    }

    // Atualizar o frete
    const dadosAtualizacao = { status };
    const resultado = await freteRepository.atualizarFrete(id, dadosAtualizacao);

    if (resultado[0] === 0) {
      return res.status(400).json({ error: "Nenhuma alteração realizada" });
    }

    // Buscar o frete atualizado para retornar
    const freteAtualizado = await freteRepository.buscarFretePorId(id);
    res.json(freteAtualizado);

  } catch (error) {
    console.error("Erro ao atualizar frete:", error);
    res.status(500).json({ error: "Erro ao atualizar frete" });
  }
}

  return {
    criar,
    listar,
    buscarPorId,
    atualizar
  };
}

module.exports = FreteController;
