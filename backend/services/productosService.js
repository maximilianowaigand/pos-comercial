const db = require("../db/index");

const CAMPOS_PROMOCION = `
  promocion_precio AS precio_promocional,
  promocion_hasta,
  promocion_unidades_limite,
  promocion_unidades_vendidas,
  promocion_motivo,
  CASE
    WHEN promocion_precio IS NOT NULL
      AND promocion_precio > 0
      AND promocion_precio < precio_base
      AND (promocion_hasta IS NULL OR promocion_hasta >= DATE('now','localtime'))
      AND (promocion_unidades_limite IS NULL OR promocion_unidades_vendidas < promocion_unidades_limite)
    THEN 1 ELSE 0
  END AS promocion_activa,
  CASE WHEN promocion_unidades_limite IS NULL THEN NULL
    ELSE MAX(0, promocion_unidades_limite - promocion_unidades_vendidas)
  END AS promocion_unidades_restantes`;

function normalizarPromocion(data, precioHabitual) {
  const valor = data.precio_promocional;
  const precioPromocional = valor === "" || valor === null || valor === undefined
    ? null
    : Number(valor);

  if (precioPromocional === null) {
    return { precioPromocional: null, hasta: null, limite: null, motivo: null };
  }
  if (!Number.isFinite(precioPromocional) || precioPromocional <= 0 || precioPromocional >= precioHabitual) {
    throw new Error("El precio promocional debe ser mayor a cero y menor que el precio habitual");
  }

  const hasta = String(data.promocion_hasta || "").trim() || null;
  if (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    throw new Error("La fecha de fin de promoción no es válida");
  }

  const limiteRaw = data.promocion_unidades_limite;
  const limite = limiteRaw === "" || limiteRaw === null || limiteRaw === undefined
    ? null
    : Number(limiteRaw);
  if (limite !== null && (!Number.isInteger(limite) || limite <= 0)) {
    throw new Error("El límite de unidades debe ser un número entero mayor a cero");
  }
  if (!hasta && limite === null) {
    throw new Error("Definí una fecha de fin o un límite de unidades para la promoción");
  }

  const motivo = String(data.promocion_motivo || "").trim() || null;
  return { precioPromocional, hasta, limite, motivo };
}

function listarProductos() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT
        id_producto AS id,
        nombre_producto AS nombre,
        precio_base AS precio,
        costo_base AS costo,
        categoria,
        ${CAMPOS_PROMOCION}
      FROM productos`,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function crearProducto(data) {
  return new Promise((resolve, reject) => {
    const { nombre, precio, costo, categoria } = data;
    let promocion;
    try {
      promocion = normalizarPromocion(data, Number(precio));
    } catch (error) {
      return reject(error);
    }

    db.run(
      `INSERT INTO productos
       (nombre_producto, precio_base, costo_base, categoria, promocion_precio,
        promocion_hasta, promocion_unidades_limite, promocion_unidades_vendidas, promocion_motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [nombre, precio, costo || 0, categoria || "sin_categoria", promocion.precioPromocional,
        promocion.hasta, promocion.limite, promocion.motivo],
      function (err) {
        if (err) return reject(err);

        resolve({
          id: this.lastID,
          nombre,
          precio,
          costo,
          categoria,
          precio_promocional: promocion.precioPromocional,
          promocion_hasta: promocion.hasta,
          promocion_unidades_limite: promocion.limite,
          promocion_unidades_vendidas: 0,
          promocion_unidades_restantes: promocion.limite,
          promocion_motivo: promocion.motivo,
          promocion_activa: promocion.precioPromocional ? 1 : 0,
        });
      }
    );
  });
}

function actualizarProducto(data) {
  return new Promise((resolve, reject) => {
    const { id, nombre, precio, costo, categoria } = data;
    let promocion;
    try {
      promocion = normalizarPromocion(data, Number(precio));
    } catch (error) {
      return reject(error);
    }

    db.run(
      `UPDATE productos
       SET nombre_producto = ?,
           precio_base = ?,
           costo_base = ?,
           categoria = ?,
           promocion_unidades_vendidas = CASE
             WHEN IFNULL(promocion_precio, -1) != IFNULL(?, -1)
               OR IFNULL(promocion_hasta, '') != IFNULL(?, '')
               OR IFNULL(promocion_unidades_limite, -1) != IFNULL(?, -1)
             THEN 0 ELSE promocion_unidades_vendidas END,
           promocion_precio = ?,
           promocion_hasta = ?,
           promocion_unidades_limite = ?,
           promocion_motivo = ?
       WHERE id_producto = ?`,
      [nombre, precio, costo || 0, categoria || "sin_categoria",
        promocion.precioPromocional, promocion.hasta, promocion.limite,
        promocion.precioPromocional, promocion.hasta, promocion.limite, promocion.motivo, id],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

function eliminarProducto(id) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM productos WHERE id_producto = ?`,
      [id],
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
  actualizarProducto,
  eliminarProducto
};
