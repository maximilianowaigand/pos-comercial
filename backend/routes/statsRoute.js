const express = require("express");
const router = express.Router();
const statsController = require("../controllers/statsController");

router.get("/clientes-hoy", statsController.clientesDelDia);

module.exports = router;