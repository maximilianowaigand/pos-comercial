const express = require("express");
const router = express.Router();
const db = require("../db/index");

// GET productos
router.get("/", (req, res) => {
  db.all(
    `
    SELECT 
      id_producto AS id,
      nombre_producto AS nombre,
      precio_base AS precio,
      categoria
    FROM productos`,
    [],
    (err, rows) => {
      if (err) {
        console.error("Error obteniendo productos:", err);
        return res.status(500).json({ error: "Error al obtener productos" });
      }

      res.json(rows);
    }
  );
});
// 🟢 POST producto
// ======================
router.post("/", (req, res) => {
  const { nombre, precio, costo, categoria } = req.body;

  // Validación
  if (!nombre || !precio) {
    return res.status(400).json({
      error: "Nombre y precio son obligatorios"
    });
  }

  const categoriaFinal = categoria || "sin_categoria";

  db.run(
    `INSERT INTO productos 
     (nombre_producto, precio_base, costo_base, categoria)
     VALUES (?, ?, ?, ?)`,
    [nombre, precio, costo || 0, categoriaFinal],
    function (err) {
      if (err) {
        console.error("Error insertando producto:", err);
        return res.status(500).json({ error: "Error al insertar producto" });
      }

      res.status(201).json({
        id: this.lastID,
        nombre,
        precio,
        categoria: categoriaFinal
      });
    }
  );
});


module.exports = router;