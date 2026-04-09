const express = require("express");
const router = express.Router();
const { emitirFacturaTusFacturas } = require("../controllers/facturaController");

// Ruta para facturar desde el POS
router.post("/facturar", async (req, res) => {
  const { items, total, datosCliente } = req.body; // 👈 EXTRAEMOS LOS CAMPOS CORRECTOS

  try {
    const factura = await emitirFacturaTusFacturas(items, total, datosCliente); // 👈 PASAMOS TODO CORRECTO

    if (!factura) {
      return res.status(400).json({ error: "Error al generar factura" });
    }

    res.json(factura);

  } catch (error) {
    console.error("❌ Error en /api/facturar:", error);
    res.status(500).json({ error: "Error interno al generar factura" });
  }
});

module.exports = router;
