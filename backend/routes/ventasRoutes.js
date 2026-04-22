const express = require("express");
const router = express.Router();
const ventasController = require("../controllers/ventasController");


// Registrar venta
router.post("/", ventasController.registrarVenta);

// Total del día
router.get("/total-dia", ventasController.totalDia);

// Total del mes
router.get("/total-mes", ventasController.totalMes);

router.get("/", ventasController.listarVentas);

router.get("/:id", ventasController.getVentaById);


module.exports = router;
