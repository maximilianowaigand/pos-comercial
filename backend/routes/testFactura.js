const express = require("express");
const router = express.Router();
const { emitirFacturaTusFacturas } = require("../controllers/facturaController");

router.post("/test-factura", async (req, res) => {
  try {
    const { items, total, cliente } = req.body;

    console.log("📤 Probando facturación con:", req.body);

    const r = await emitirFacturaTusFacturas(items, total, cliente);

    console.log("📥 Respuesta:", r);

    res.json({ ok: true, respuesta: r });

  } catch (err) {
    console.error("❌ Error en test-factura:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
