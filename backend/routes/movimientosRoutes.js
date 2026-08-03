const express = require("express");
const controller = require("../controllers/movimientosController");
const router = express.Router();

router.get("/", controller.listar);
router.get("/alertas", controller.alertas);
router.get("/caja-diaria", controller.cajaDiaria);
router.post("/", controller.crear);
router.post("/cerrar-balance", controller.cerrarBalance);
router.put("/caja-diaria/:fecha/apertura", controller.guardarAperturaCaja);
router.put("/caja-diaria/:fecha/cierre", controller.cerrarCajaDiaria);
router.put("/recurrentes/:id", controller.actualizarMontoRecurrente);
router.put("/:id/estado", controller.actualizarEstado);

module.exports = router;
