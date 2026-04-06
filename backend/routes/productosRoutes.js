const express = require("express");
const router = express.Router();
const pool = require("../db/index");

// GET productos
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
              id_producto AS id,
              nombre_producto AS nombre,
              precio_base + 0 AS precio,
              categoria
      FROM productos
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

module.exports = router;