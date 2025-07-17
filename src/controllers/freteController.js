const freteRepository = require("../repositories/freteRepository");
const { Usuario } = require("../model/Usuarios");

function FreteController() {
  async function criar(req, res) {
    try {
      const { empresa_id, motorista_id, data_prevista_entrega } = req.body;
      const usuarioLogadoId = req.user.usuario_id;

      if (!empresa_id || !motorista_id) {
        return res
          .status(400)
          .json({ error: "Empresa e motorista são obrigatórios" });
      }

      const [empresa, motorista] = await Promise.all([
        Usuario.findOne({ where: { usuario_id: empresa_id, role: "empresa" } }),
        Usuario.findOne({
          where: { usuario_id: motorista_id, role: "motorista" },
        }),
      ]);

      if (!empresa || !motorista) {
        return res
          .status(400)
          .json({ error: "Empresa ou motorista inválidos" });
      }

      if (req.user.role !== "empresa" || usuarioLogadoId !== empresa_id) {
        return res.status(403).json({ error: "Não autorizado" });
      }

      const frete = await freteRepository.criarFrete({
        empresa_id,
        motorista_id,
        data_prevista_entrega,
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
      const fretes = await freteRepository.listarFretesPorUsuario(usuario_id);
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

      const frete = await freteRepository.buscarFretePorId(id);

      if (!frete) {
        return res.status(404).json({ error: "Frete não encontrado" });
      }

      if (
        frete.empresa_id !== usuario_id &&
        frete.motorista_id !== usuario_id
      ) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      res.json(frete);
    } catch (error) {
      console.error("Erro ao buscar frete:", error);
      res.status(500).json({ error: "Erro ao buscar frete" });
    }
  }

  return {
    criar,
    listar,
    buscarPorId,
  };
}

module.exports = FreteController;
