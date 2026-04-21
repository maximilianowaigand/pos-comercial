const express = require("express");
const router = express.Router();
const productosController = require("../controllers/productosController");

// GET
router.get("/", productosController.listar);

// POST
router.post("/", productosController.crear);

// PUT
router.put("/:id", productosController.actualizar);

router.delete("/:id", productosController.eliminar);

module.exports = router;