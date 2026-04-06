const express = require("express");
const router = express.Router();
const ventasController = require("../controllers/ventasController");

// Registrar venta
router.post("/registrar-venta", ventasController.registrarVenta);

// Total del día
router.get("/total-dia", ventasController.totalDia);

// Total del mes
router.get("/total-mes", ventasController.totalMes);

module.exports = router;
