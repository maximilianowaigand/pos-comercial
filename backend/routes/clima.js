const express = require("express");
const router = express.Router();
const { guardarClima } = require("../services/climaService");

router.get("/actualizar-clima", async (req, res) => {
  try {
    const result = await guardarClima();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Error actualizando clima" });
  }
});

module.exports = router;