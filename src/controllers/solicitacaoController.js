// controllers/solicitacaoController.js
const solicitacaoRepository = require("../repositories/solicitacaoRepository");
const freteRepository = require("../repositories/freteRepository");
const { Usuario } = require("../model/Usuarios");

function SolicitacaoController() {
  async function solicitar(req, res) {
    try {
      const { frete_id } = req.body;
      const motorista_id = req.user.usuario_id;

      console.log("=== DEBUG: SOLICITAR FRETE ===");
      console.log("frete_id recebido:", frete_id);
      console.log("motorista_id:", motorista_id);
      console.log("user role:", req.user.role);

      if (req.user.role !== "motorista") {
        console.log("ERRO: Usuário não é motorista");
        return res
          .status(403)
          .json({ error: "Apenas motoristas podem solicitar fretes" });
      }

      console.log("Buscando frete por ID:", frete_id);
      const frete = await freteRepository.buscarFretePorId(frete_id);

      if (!frete) {
        console.log("ERRO: Frete não encontrado");
        return res.status(400).json({ error: "Frete não encontrado" });
      }

      if (frete.status !== "anunciado") {
        console.log('ERRO: Status do frete não é "anunciado"');
        return res.status(400).json({
          error:
            "Frete não disponível para solicitação. Status: " + frete.status,
        });
      }

      const solicitacaoExistente =
        await solicitacaoRepository.verificarSolicitacaoExistente(
          frete_id,
          motorista_id
        );

      if (solicitacaoExistente) {
        return res.status(400).json({ error: "Você já solicitou este frete" });
      }

      console.log("Criando nova solicitação...");
      const solicitacao = await solicitacaoRepository.criarSolicitacao({
        empresa_id: frete.empresa_id,
        motorista_id,
        frete_id,
        status: "pendente",
      });

      res.status(201).json(solicitacao);
    } catch (error) {
      console.error("Erro ao solicitar frete:", error);
      res
        .status(500)
        .json({ error: "Erro ao solicitar frete: " + error.message });
    }
  }

  async function listarPorEmpresa(req, res) {
    try {
      const empresa_id = req.user.usuario_id;

      if (req.user.role !== "empresa") {
        return res
          .status(403)
          .json({ error: "Apenas empresas podem ver solicitações" });
      }

      const solicitacoes =
        await solicitacaoRepository.listarSolicitacoesPorEmpresa(empresa_id);
      res.json(solicitacoes);
    } catch (error) {
      console.error("Erro ao listar solicitações:", error);
      res.status(500).json({ error: "Erro ao listar solicitações" });
    }
  }

  async function listarPorMotorista(req, res) {
    try {
      const motorista_id = req.user.usuario_id;

      if (req.user.role !== "motorista") {
        return res
          .status(403)
          .json({ error: "Apenas motoristas podem ver suas solicitações" });
      }

      const solicitacoes =
        await solicitacaoRepository.listarSolicitacoesPorMotorista(
          motorista_id
        );
      res.json(solicitacoes);
    } catch (error) {
      console.error("Erro ao listar solicitações:", error);
      res.status(500).json({ error: "Erro ao listar solicitações" });
    }
  }

  async function responder(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const empresa_id = req.user.usuario_id;

      if (req.user.role !== "empresa") {
        return res
          .status(403)
          .json({ error: "Apenas empresas podem responder solicitações" });
      }

      if (!["aceita", "rejeitada"].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const solicitacao = await solicitacaoRepository.buscarSolicitacaoPorId(
        id
      );

      if (!solicitacao || solicitacao.empresa_id !== empresa_id) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }

      if (solicitacao.status !== "pendente") {
        return res.status(400).json({ error: "Solicitação já respondida" });
      }

      await solicitacaoRepository.atualizarSolicitacao(id, {
        status,
        data_resposta: new Date(),
      });

      if (status === "aceita") {
        await freteRepository.atualizarFrete(solicitacao.frete_id, {
          motorista_id: solicitacao.motorista_id,
          status: "em_andamento",
        });

        await solicitacaoRepository.rejeitarOutrasSolicitacoes(
          solicitacao.frete_id,
          id
        );
      }

      const solicitacaoAtualizada =
        await solicitacaoRepository.buscarSolicitacaoPorId(id);
      res.json({
        message: "Solicitação respondida com sucesso",
        solicitacao: solicitacaoAtualizada,
      });
    } catch (error) {
      console.error("Erro ao responder solicitação:", error);
      res.status(500).json({ error: "Erro ao responder solicitação" });
    }
  }

  return {
    solicitar,
    listarPorEmpresa,
    listarPorMotorista,
    responder,
  };
}

module.exports = SolicitacaoController;
