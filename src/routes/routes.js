const express = require("express");
const router = express.Router();
router.use(express.json());

const UsuarioController = require("../controllers/usuarioController");
const usuarioController = UsuarioController();

// Rotas públicas
router.post("/cadastrar", usuarioController.cadastrar);
router.post("/login", usuarioController.logar);

// Rotas protegidas (adicionar middleware de autenticação conforme necessário)
router.get("/usuarios", usuarioController.listar);
router.get("/:id", usuarioController.buscarPorId);
router.put("/:id", usuarioController.atualizar);
router.delete("/:id", usuarioController.deletar);

module.exports = router;