const express = require("express");
const router = express.Router();
const {
  consultarComprobante,
  consultarComprobantesHastaUltimo,
  probarConexionArca,
} = require("../services/arcaService");
const { getArcaProfiles } = require("../config/arcaProfiles");

router.get("/arca/test", async (req, res) => {
  try {
    const result = await probarConexionArca();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error probando ARCA:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

router.get("/arca/perfiles", (req, res) => {
  const profiles = getArcaProfiles().map((profile) => ({
    id: profile.id,
    label: profile.label,
    available: profile.available,
    fiscal: profile.fiscal !== false,
    cuit: profile.cuit,
    puntoVenta: profile.puntoVenta,
  }));

  res.json({ success: true, profiles });
});

router.get("/arca/comprobantes", async (req, res) => {
  try {
    const result = await consultarComprobantesHastaUltimo();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error consultando comprobantes ARCA:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

router.get("/arca/comprobantes/:numero", async (req, res) => {
  try {
    const result = await consultarComprobante(req.params.numero);
    res.json({ success: true, comprobante: result });
  } catch (error) {
    console.error("Error consultando comprobante ARCA:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
