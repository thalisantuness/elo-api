const freteRepository = require("../repositories/freteRepository");
const { Usuario } = require("../model/Usuarios");
const { Sequelize } = require("sequelize");
const { Frete } = require("../model/Frete");

function FreteController(io) {
  async function criar(req, res) {
    try {
      const {
        empresa_id,
        data_prevista_entrega,
        origem_estado,
        origem_cidade,
        destino_estado,
        destino_cidade,
        valor_frete,
        precisa_lona,
        produto_quimico,
        observacoes_motorista,
        veiculo_tracao,
        tipos_carreta,
        comprimento_carreta,
        numero_eixos,
        configuracao_modelo,
        tipo_carga,
        observacoes_carga,
      } = req.body;
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
        origem_estado,
        origem_cidade,
        destino_estado,
        destino_cidade,
        valor_frete,
        precisa_lona,
        produto_quimico,
        observacoes_motorista,
        veiculo_tracao,
        tipos_carreta,
        comprimento_carreta,
        numero_eixos,
        configuracao_modelo,
        tipo_carga,
        observacoes_carga,
      });

      if (io) {
        io.emit("novo_frete_disponivel", frete);
      }

      res.status(201).json(frete);
    } catch (error) {
      console.error("Erro ao criar frete:", error);
      res.status(500).json({ error: "Erro ao criar frete" });
    }
  }

  async function listar(req, res) {
    try {
      const { usuario_id, role } = req.user;
      const { origem_cidade, destino_cidade, tipo_carga, filtro } = req.query;

      const filtros = {};

      if (tipo_carga) {
        const tipos = tipo_carga.split(",");
        filtros.tipo_carga = { [Sequelize.Op.in]: tipos };
      }

      if (origem_cidade)
        filtros.origem_cidade = { [Sequelize.Op.iLike]: `%${origem_cidade}%` };
      if (destino_cidade)
        filtros.destino_cidade = {
          [Sequelize.Op.iLike]: `%${destino_cidade}%`,
        };

      if (filtro) {
        filtros[Sequelize.Op.or] = [
          { origem_cidade: { [Sequelize.Op.iLike]: `%${filtro}%` } },
          { destino_cidade: { [Sequelize.Op.iLike]: `%${filtro}%` } },
          { tipo_carga: { [Sequelize.Op.iLike]: `%${filtro}%` } },
        ];
      }

      const fretes = await freteRepository.listarFretes(
        usuario_id,
        role,
        filtros
      );
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
      const dadosAtualizacao = req.body;
      const usuario_id = req.user.usuario_id;

      const frete = await freteRepository.buscarFretePorId(id);
      if (!frete) {
        return res.status(404).json({ error: "Frete não encontrado" });
      }

      if (frete.empresa_id !== usuario_id) {
        return res
          .status(403)
          .json({ error: "Acesso não autorizado para editar este frete" });
      }

      delete dadosAtualizacao.frete_id;
      delete dadosAtualizacao.empresa_id;
      delete dadosAtualizacao.motorista_id;
      delete dadosAtualizacao.data_criacao;

      const [updated] = await freteRepository.atualizarFrete(
        id,
        dadosAtualizacao
      );

      if (updated === 0) {
        return res
          .status(200)
          .json({ message: "Nenhuma alteração detectada.", frete });
      }

      const freteAtualizado = await freteRepository.buscarFretePorId(id);
      res.json(freteAtualizado);
    } catch (error) {
      console.error("Erro ao atualizar frete:", error);
      res.status(500).json({ error: "Erro ao atualizar frete" });
    }
  }

  async function deletar(req, res) {
    try {
      const { id } = req.params;
      const usuario_id = req.user.usuario_id;

      const frete = await freteRepository.buscarFretePorId(id);

      if (!frete) {
        return res.status(404).json({ error: "Frete não encontrado" });
      }

      if (frete.empresa_id !== usuario_id) {
        return res
          .status(403)
          .json({ error: "Acesso não autorizado para apagar este frete" });
      }

      await freteRepository.deletarFrete(id);

      res.status(200).json({ message: "Frete apagado com sucesso" });
    } catch (error) {
      console.error("Erro ao apagar frete:", error);
      res.status(500).json({ error: "Erro ao apagar frete" });
    }
  }

  return {
    criar,
    listar,
    buscarPorId,
    atualizar,
    deletar,
  };
}

module.exports = FreteController;
