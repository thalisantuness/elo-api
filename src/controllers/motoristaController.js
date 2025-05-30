const motoristaRepository = require("../repositories/motoristaRepository");
const bcrypt = require("bcrypt");

function MotoristaController() {
  async function getMotorista(req, res) {
    try {
      const { tipo_id, cidade_id, n_quartos, n_banheiros, n_vagas, estado_id } =
        req.query;

      const filtros = {};

      if (tipo_id) filtros.tipo_id = tipo_id;
      if (cidade_id) filtros.cidade_id = cidade_id;
      if (n_quartos) filtros.n_quartos = n_quartos;
      if (n_banheiros) filtros.n_banheiros = n_banheiros;
      if (n_vagas) filtros.n_vagas = n_vagas;
      if (estado_id) filtros.estado_id = estado_id;

      const imoveis = await motoristaRepository.listarMotorista(filtros);

      if (imoveis.length === 0) {
        return res
          .status(404)
          .json({
            error: "Nenhum imóvel encontrado com os filtros fornecidos",
          });
      }

      res.json(imoveis);
    } catch (error) {
      console.error("Erro ao obter imóveis:", error);
      res.status(500).json({ error: "Erro ao obter imóveis" });
    }
  }

  async function compressImage(buffer) {
    return sharp(buffer).resize(500, 500).jpeg({ quality: 80 }).toBuffer();
  }

  async function uploadToS3(buffer, fileName) {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `imoveis/${fileName}`,
      Body: buffer,
      ContentType: "image/jpeg",
      ACL: "public-read",
    };

    const result = await s3.upload(params).promise();

    return result.Location;
  }

 async function postMotorista(req, res) {
  try {
    const { 
      usuario, 
      dadosMotorista, 
      referenciasPessoais = [], 
      referenciasTransportadoras = [], 
      contaBancaria,
      imagemBase64 
    } = req.body;

    // Validações
    if (!referenciasPessoais.length || !contaBancaria) {
      return res.status(400).json({ 
        error: 'Referências pessoais e conta bancária são obrigatórias' 
      });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(usuario.senha, 10);

    const resultado = await motoristaRepository.criarMotoristaCompleto({
      usuario: {
        ...usuario,
        senha: senhaHash
      },
      dadosMotorista,
      referenciasPessoais,
      referenciasTransportadoras,
      contaBancaria,
      imagemBase64
    });

    res.status(201).json({
      message: 'Motorista cadastrado com sucesso!',
      usuario: {
        usuario_id: resultado.usuario.usuario_id,
        email: resultado.usuario.email,
        role: resultado.usuario.role
      },
      motorista: resultado.motorista
    });
  } catch (error) {
    console.error('Erro ao cadastrar motorista:', error);
    res.status(500).json({ 
      error: 'Erro ao cadastrar motorista',
      details: error.message 
    });
  }
}

  async function getMotoristaById(req, res) {
    try {
      const { id } = req.params;
      const motorista = await motoristaRepository.buscarMotoristaPorId(id);

      if (!motorista) {
        return res.status(404).json({ error: "Imóvel não encontrado" });
      }

      const imageBase64 = motorista.imageData
        ? Buffer.from(motorista.imageData).toString("base64")
        : null;

      res.json({
        ...motorista.toJSON(),
        image: imageBase64 ? `data:image/png;base64,${imageBase64}` : null,
      });
    } catch (error) {
      console.error("Erro ao buscar imóvel:", error);
      res.status(500).json({ error: "Erro ao buscar imóvel" });
    }
  }

  async function putMotorista(req, res) {
    try {
      const { id } = req.params;
      const {
        nome,
        description,
        valor,
        valor_condominio,
        n_quartos,
        n_banheiros,
        n_vagas,
        tipo_id,
        cidade_id,
        estado_id,
      } = req.body;
      const imagemBase64 = req.file ? req.file.buffer : null;

      const dadosAtualizados = {
        nome,
        description,
        valor,
        valor_condominio,
        n_quartos,
        n_banheiros,
        n_vagas,
        tipo_id,
        cidade_id,
        estado_id,
      };

      if (imagemBase64) {
        dadosAtualizados.imageData = await compressImage(imagemBase64);
      }

      const motoristaAtualizado = await motoristaRepository.atualizarMotorista(
        id,
        dadosAtualizados
      );

      res.json({
        message: "Imóvel atualizado com sucesso!",
        motorista: motoristaAtualizado,
      });
    } catch (error) {
      console.error("Erro ao atualizar imóvel:", error);
      res.status(500).json({ error: "Erro ao atualizar imóvel" });
    }
  }

  async function deleteMotorista(req, res) {
    try {
      const { id } = req.params;

      const imagens = await motoristaRepository.buscarImagensPorMotoristaId(id);

      for (const imagem of imagens) {
        await motoristaRepository.deletarImagem(imagem.photo_id);

        const key = imagem.imageData.split(".com/")[1];
        const params = { Bucket: process.env.AWS_BUCKET_NAME, Key: key };

        await s3.deleteObject(params).promise();
      }

      await motoristaRepository.deletarMotorista(id);

      res.json({ message: "Imóvel e imagens excluídos com sucesso!" });
    } catch (error) {
      console.error("Erro ao excluir imóvel:", error);
      res.status(500).json({ error: "Erro ao excluir imóvel" });
    }
  }

  return {
    getMotorista,
    postMotorista,
    getMotoristaById,
    putMotorista,
    deleteMotorista,
  };
}

module.exports = MotoristaController;
