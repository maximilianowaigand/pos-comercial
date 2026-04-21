const db = require("../db/index");

// GET
function listarProductos() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        id_producto AS id,
        nombre_producto AS nombre,
        precio_base AS precio,
        categoria
      FROM productos`,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

// POST
function crearProducto(data) {
  return new Promise((resolve, reject) => {
    const { nombre, precio, costo, categoria } = data;

    db.run(
      `INSERT INTO productos 
       (nombre_producto, precio_base, costo_base, categoria)
       VALUES (?, ?, ?, ?)`,
      [nombre, precio, costo || 0, categoria || "sin_categoria"],
      function (err) {
        if (err) return reject(err);

        resolve({
          id: this.lastID,
          nombre,
          precio,
          categoria
        });
      }
    );
  });
}

// PUT
function actualizarProducto(data) {
  return new Promise((resolve, reject) => {
    const { id, nombre, precio, costo, categoria } = data;

    db.run(
      `UPDATE productos
       SET nombre_producto = ?,
           precio_base = ?,
           costo_base = ?,
           categoria = ?
       WHERE id_producto = ?`,
      [nombre, precio, costo || 0, categoria || "sin_categoria", id],
      function (err) {
        if (err) return reject(err);

        resolve({ changes: this.changes });
      }
    );
  });
}

module.exports = {
  listarProductos,
  crearProducto,
  actualizarProducto
};