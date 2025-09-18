const usuariosRepository = require("../repositories/usuariosRepository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.json");
const { Sequelize } = require("sequelize");

function UsuarioController() {
  async function cadastrar(req, res) {
    // ... seu código de cadastro existente ...
    try {
      const {
        imagem_perfil,
        comprovante_residencia_motorista,
        documento_dono_caminhao,
        comprovante_residencia_dono_caminhao,
        antt,
        cnh,
        placa_1,
        placa_2,
        placa_3,
        alvara,
        comprovante_empresa,
        documento_empresa,
        celular,
        cnpj,
        nome_referencia_pessoal_1,
        numero_referencia_pessoal_1,
        nome_referencia_pessoal_2,
        numero_referencia_pessoal_2,
        nome_referencia_pessoal_3,
        numero_referencia_pessoal_3,
        nome_referencia_comercial_1,
        numero_referencia_comercial_1,
        nome_referencia_comercial_2,
        numero_referencia_comercial_2,
        nome_referencia_comercial_3,
        numero_referencia_comercial_3,
        nome_referencia_motorista_1,
        numero_referencia_motorista_1,
        nome_referencia_motorista_2,
        numero_referencia_motorista_2,
        nome_referencia_motorista_3,
        numero_referencia_motorista_3,
        nome_responsavel_administrativo,
        telefone_responsavel_administrativo,
        tipo_conta,
        ...usuarioData
      } = req.body;

      const validTipoConta = (value) => {
        if (!value) return null;
        const lowerValue = value.toLowerCase();
        if (lowerValue === "corrente" || lowerValue === "conta corrente") return "Corrente";
        if (lowerValue === "poupança" || lowerValue === "poupanca" || lowerValue === "conta poupança") return "Poupança";
        return null;
      };

      const documentos = {
        comprovante_residencia_motorista,
        documento_dono_caminhao,
        comprovante_residencia_dono_caminhao,
        antt,
        cnh,
        placa_1,
        placa_2,
        placa_3,
        alvara,
        comprovante_empresa,
        documento_empresa
      };

      if (!usuarioData.email || !usuarioData.senha || !usuarioData.role || !celular) {
        return res.status(400).json({ error: "Email, senha, role e celular são obrigatórios" });
      }

      const usuarioExistente = await usuariosRepository.buscarUsuarioPorEmail(usuarioData.email);
      if (usuarioExistente) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }

      if (!/^\d{10,11}$/.test(celular)) {
        return res.status(400).json({ error: "Celular inválido. Use apenas números (10 ou 11 dígitos)." });
      }

      let cleanedCnpj = cnpj ? cnpj.replace(/[^\d]/g, '') : null;
      if (cleanedCnpj && !/^\d{14}$/.test(cleanedCnpj)) {
        return res.status(400).json({ error: "CNPJ inválido. Use 14 dígitos." });
      }

      if (usuarioData.role === "motorista") {
        if (!antt || !cnh || !comprovante_residencia_motorista || !documento_dono_caminhao || !comprovante_residencia_dono_caminhao) {
          return res.status(400).json({ error: "ANTT, CNH, comprovante de residência do motorista, documento do dono do caminhão e comprovante de residência do dono do caminhão são obrigatórios para motoristas" });
        }
        if (usuarioData.numero_placas >= 1 && !placa_1) {
          return res.status(400).json({ error: "Imagem da placa 1 é obrigatória quando o número de placas é 1 ou mais" });
        }
        if (usuarioData.numero_placas >= 2 && !placa_2) {
          return res.status(400).json({ error: "Imagem da placa 2 é obrigatória quando o número de placas é 2 ou mais" });
        }
        if (usuarioData.numero_placas === 3 && !placa_3) {
          return res.status(400).json({ error: "Imagem da placa 3 é obrigatória quando o número de placas é 3" });
        }
        for (const [docName, docValue] of Object.entries(documentos)) {
          if (docValue && !docValue.startsWith('data:image')) {
            return res.status(400).json({ error: `Formato inválido para o documento ${docName}` });
          }
        }
      } else if (usuarioData.role === "empresa") {
        if (!nome_responsavel_administrativo || !telefone_responsavel_administrativo || !cleanedCnpj) {
          return res.status(400).json({ error: "Nome do responsável administrativo, telefone do responsável e CNPJ são obrigatórios para empresas" });
        }
        if (!/^\d{10,11}$/.test(telefone_responsavel_administrativo)) {
          return res.status(400).json({ error: "Telefone do responsável administrativo inválido. Use apenas números (10 ou 11 dígitos)." });
        }
        for (const [docName, docValue] of Object.entries({ alvara, comprovante_empresa, documento_empresa })) {
          if (docValue && !docValue.startsWith('data:image')) {
            return res.status(400).json({ error: `Formato inválido para o documento ${docName}` });
          }
        }
        const referenciasTelefones = [
          numero_referencia_pessoal_1,
          numero_referencia_pessoal_2,
          numero_referencia_pessoal_3,
          numero_referencia_comercial_1,
          numero_referencia_comercial_2,
          numero_referencia_comercial_3,
          numero_referencia_motorista_1,
          numero_referencia_motorista_2,
          numero_referencia_motorista_3
        ].filter(t => t);
        for (const telefone of referenciasTelefones) {
          if (!/^\d{10,11}$/.test(telefone)) {
            return res.status(400).json({ error: "Telefone de referência inválido. Use apenas números (10 ou 11 dígitos)." });
          }
        }
      } else {
        return res.status(400).json({ error: "Role inválido. Use 'motorista' ou 'empresa'." });
      }

      const usuarioCriado = await usuariosRepository.criarUsuario({
        usuario: {
          ...usuarioData,
          celular,
          cnpj: cleanedCnpj,
          nome_referencia_pessoal_1,
          numero_referencia_pessoal_1,
          nome_referencia_pessoal_2,
          numero_referencia_pessoal_2,
          nome_referencia_pessoal_3,
          numero_referencia_pessoal_3,
          nome_referencia_comercial_1,
          numero_referencia_comercial_1,
          nome_referencia_comercial_2,
          numero_referencia_comercial_2,
          nome_referencia_comercial_3,
          numero_referencia_comercial_3,
          nome_referencia_motorista_1,
          numero_referencia_motorista_1,
          nome_referencia_motorista_2,
          numero_referencia_motorista_2,
          nome_referencia_motorista_3,
          numero_referencia_motorista_3,
          nome_responsavel_administrativo,
          telefone_responsavel_administrativo,
          tipo_conta: validTipoConta(tipo_conta)
        },
        imagemBase64: imagem_perfil,
        documentos
      });

      const usuarioRetorno = usuarioCriado.toJSON();
      delete usuarioRetorno.senha;

      res.status(201).json({
        message: "Usuário cadastrado com sucesso",
        usuario: usuarioRetorno
      });
    } catch (error) {
      console.error("Erro no cadastro:", error);
      res.status(500).json({
        error: "Erro ao cadastrar usuário",
        details: error.message
      });
    }
  }

  async function logar(req, res) {
    try {
      const { email, senha } = req.body;

      const usuario = await usuariosRepository.buscarUsuarioPorEmail(email);
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: "Senha incorreta" });
      }

      const token = jwt.sign(
        {
          usuario_id: usuario.usuario_id,
          role: usuario.role,
          email: usuario.email
        },
        authConfig.secret,
        { expiresIn: "24h" }
      );

      const resposta = {
        usuario: {
          usuario_id: usuario.usuario_id,
          email: usuario.email,
          role: usuario.role,
          nome_completo: usuario.nome_completo,
          imagem_perfil: usuario.imagem_perfil
        },
        token
      };

      res.json(resposta);
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ error: "Erro no login" });
    }
  }

  async function listar(req, res) {
    try {
      const { role: userRole } = req.user; // Role do usuário logado (do token)

      // Define qual role queremos buscar (oposta à do usuário logado)
      const targetRole = userRole === 'motorista' ? 'empresa' : 'motorista';

      const usuarios = await usuariosRepository.listarUsuarios({
        role: targetRole,
        usuario_id: { [Sequelize.Op.ne]: req.user.usuario_id } // Exclui o próprio usuário
      });

      res.json(
        usuarios.map((u) => {
          const usuario = u.toJSON();
          delete usuario.senha;
          return {
            usuario_id: usuario.usuario_id,
            nome_completo: usuario.nome_completo,
            email: usuario.email,
            role: usuario.role,
            imagem_perfil: usuario.imagem_perfil,
            celular: usuario.celular // Adicione mais campos se necessário
          };
        })
      );
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      res.status(500).json({ error: "Erro ao listar usuários" });
    }
  }

  // --- FUNÇÃO CORRIGIDA/READICIONADA ---
  async function buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const usuario = await usuariosRepository.buscarUsuarioPorId(id);

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const usuarioRetorno = usuario.toJSON();
      delete usuarioRetorno.senha;

      res.json(usuarioRetorno);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  }

  async function atualizar(req, res) {
    try {
      const { id } = req.params;
      const dadosAtualizacao = req.body;

      delete dadosAtualizacao.senha;
      delete dadosAtualizacao.usuario_id;
      delete dadosAtualizacao.role;

      const [updated] = await usuariosRepository.atualizarUsuario(id, dadosAtualizacao);

      if (!updated) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const usuarioAtualizado = await usuariosRepository.buscarUsuarioPorId(id);
      const usuarioRetorno = usuarioAtualizado.toJSON();
      delete usuarioRetorno.senha;

      res.json({
        message: "Usuário atualizado com sucesso",
        usuario: usuarioRetorno
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  }

  async function atualizarPerfil(req, res) {
    try {
      const { id } = req.params;
      const dadosAtualizacao = req.body;
      const usuarioLogadoId = req.user.usuario_id;
      const usuarioLogadoRole = req.user.role;

      if (parseInt(id, 10) !== usuarioLogadoId) {
        return res.status(403).json({ error: "Não autorizado a editar este perfil." });
      }

      // Campos que NUNCA podem ser alterados
      delete dadosAtualizacao.senha;
      delete dadosAtualizacao.role;
      delete dadosAtualizacao.usuario_id;
      delete dadosAtualizacao.cpf;
      delete dadosAtualizacao.cnpj;

      // Lista completa de campos permitidos para cada role
      const camposPermitidos = {
        comuns: [
          'nome_completo', 'email', 'celular', 'endereco', 'banco',
          'agencia', 'numero_conta', 'tipo_conta', 'titular_conta', 'cpf_titular_conta'
        ],
        motorista: [
          'data_nascimento', 'numero_placas',
          'nome_referencia_pessoal_1', 'numero_referencia_pessoal_1',
          'nome_referencia_pessoal_2', 'numero_referencia_pessoal_2',
          'nome_referencia_pessoal_3', 'numero_referencia_pessoal_3',
          'nome_referencia_comercial_1', 'numero_referencia_comercial_1',
          'nome_referencia_comercial_2', 'numero_referencia_comercial_2',
          'nome_referencia_transportadora_1', 'numero_referencia_transportadora_1',
          'nome_referencia_transportadora_2', 'numero_referencia_transportadora_2',
          'nome_referencia_transportadora_3', 'numero_referencia_transportadora_3'
        ],
        empresa: [
          'nome_responsavel_administrativo', 'telefone_responsavel_administrativo',
          'nome_referencia_pessoal_1', 'numero_referencia_pessoal_1',
          'nome_referencia_pessoal_2', 'numero_referencia_pessoal_2',
          'nome_referencia_comercial_1', 'numero_referencia_comercial_1',
          'nome_referencia_comercial_2', 'numero_referencia_comercial_2',
          'nome_referencia_motorista_1', 'numero_referencia_motorista_1',
          'nome_referencia_motorista_2', 'numero_referencia_motorista_2',
          'nome_referencia_motorista_3', 'numero_referencia_motorista_3'
        ]
      };

      const payloadFinal = {};
      const camposParaAtualizar = [...camposPermitidos.comuns, ...(camposPermitidos[usuarioLogadoRole] || [])];

      for (const campo of camposParaAtualizar) {
        if (dadosAtualizacao[campo] !== undefined) {
          payloadFinal[campo] = dadosAtualizacao[campo];
        }
      }

      const usuarioAtualizado = await usuariosRepository.atualizarPerfil(id, payloadFinal);

      if (!usuarioAtualizado) {
        return res.status(404).json({ error: "Usuário não encontrado ou nenhuma alteração realizada." });
      }

      const usuarioRetorno = usuarioAtualizado.toJSON();
      delete usuarioRetorno.senha;

      res.json({
        message: "Perfil atualizado com sucesso!",
        usuario: usuarioRetorno
      });

    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({ error: "Erro interno ao atualizar perfil." });
    }
  }

  // --- INÍCIO DAS FUNÇÕES NOVAS ---
  async function alterarSenha(req, res) {
    try {
      const { id } = req.params;
      const { senhaAtual, novaSenha } = req.body;
      const usuarioLogadoId = req.user.usuario_id;

      if (parseInt(id, 10) !== usuarioLogadoId) {
        return res.status(403).json({ error: "Não autorizado." });
      }

      if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias." });
      }

      const usuario = await usuariosRepository.buscarUsuarioPorIdComSenha(id);
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: "Senha atual incorreta." });
      }

      const senhaHash = await bcrypt.hash(novaSenha, 10);
      await usuariosRepository.atualizarUsuario(id, { senha: senhaHash });

      res.status(200).json({ message: "Senha alterada com sucesso." });

    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      res.status(500).json({ error: "Erro interno ao alterar senha." });
    }
  }

  async function atualizarDocumento(req, res) {
    try {
      const { id } = req.params;
      const { docType, imageBase64 } = req.body;
      const usuarioLogadoId = req.user.usuario_id;

      if (parseInt(id, 10) !== usuarioLogadoId) {
        return res.status(403).json({ error: "Não autorizado." });
      }

      if (!docType || !imageBase64) {
        return res.status(400).json({ error: "Tipo do documento e imagem são obrigatórios." });
      }

      const updatedUser = await usuariosRepository.atualizarDocumentoUsuario(id, docType, imageBase64);

      res.status(200).json({
        message: "Documento atualizado com sucesso!",
        usuario: updatedUser
      });
    } catch (error) {
      console.error("Erro ao atualizar documento:", error);
      res.status(500).json({ error: "Erro interno ao atualizar o documento." });
    }
  }
  // --- FIM DAS FUNÇÕES NOVAS ---

  async function buscarDocumentosMotorista(req, res) {
    try {
      const usuario_id = req.user?.usuario_id;
      if (!usuario_id) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const usuario = await usuariosRepository.buscarUsuarioPorId(usuario_id);
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      if (usuario.role !== "motorista") {
        return res.status(403).json({ error: "Acesso permitido apenas para motoristas" });
      }

      const documentos = {
        cnh: usuario.cnh,
        comprovante_residencia_motorista: usuario.comprovante_residencia_motorista,
        documento_dono_caminhao: usuario.documento_dono_caminhao,
        comprovante_residencia_dono_caminhao: usuario.comprovante_residencia_dono_caminhao,
      };

      // Filtra apenas os documentos que existem (não nulos)
      const documentosValidos = Object.entries(documentos)
        .filter(([_, url]) => url)
        .reduce((acc, [key, url]) => ({ ...acc, [key]: url }), {});

      if (Object.keys(documentosValidos).length === 0) {
        return res.status(404).json({ error: "Nenhum documento encontrado" });
      }

      res.json({
        message: "Documentos encontrados com sucesso",
        documentos: documentosValidos,
      });
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      res.status(500).json({ error: "Erro ao buscar documentos" });
    }
  }

  async function deletar(req, res) {
    try {
      const { id } = req.params;
      const deletado = await usuariosRepository.deletarUsuario(id);

      if (!deletado) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ error: "Erro ao excluir usuário" });
    }
  }

  return {
    cadastrar,
    logar,
    listar,
    buscarPorId, 
    atualizar,
    deletar,
    buscarDocumentosMotorista,
    atualizarPerfil,
    alterarSenha,
    atualizarDocumento,
  };
}

module.exports = UsuarioController;