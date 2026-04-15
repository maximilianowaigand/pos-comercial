const db = require("../db");

// 🧾 guardar venta con detalle
function registrarVenta(data) {
  return new Promise((resolve, reject) => {
    const { items, metodo_pago, total } = data;

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      db.run(
        `INSERT INTO ventas (fecha, hora, medio_pago, total, estado)
         VALUES (DATE('now','localtime'), TIME('now','localtime'), ?, ?, 'CERRADA')`,
        [metodo_pago, total],
        function (err) {
          if (err) return reject(err);

          const ventaId = this.lastID;

          const stmt = db.prepare(`
            INSERT INTO detalle_venta
            (id_venta, id_producto, cantidad, precio_unitario)
            VALUES (?, ?, ?, ?)
          `);

          for (const item of items) {
            stmt.run([
              ventaId,
              item.producto_id,
              item.cantidad,
              item.precio_unitario
            ]);
          }

          stmt.finalize();

          db.run("COMMIT");

          resolve({
            ventaId,
            total
          });
        }
      );
    });
  });
}

// 📊 totales
function getTotales() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT medio_pago, SUM(total) as totalDia
       FROM ventas
       WHERE DATE(fecha) = DATE('now')
       GROUP BY medio_pago`,
      [],
      (err, rows) => {
        if (err) return reject(err);

        let efectivo = 0;
        let transferencia = 0;
        let tarjeta = 0;

        rows.forEach(r => {
          if (r.medio_pago === "efectivo") efectivo = r.totalDia;
          if (r.medio_pago === "transferencia") transferencia = r.totalDia;
          if (r.medio_pago === "tarjeta") tarjeta = r.totalDia;
        });

        resolve({
          totalDia: efectivo + transferencia + tarjeta,
          efectivo,
          transferencia,
          tarjeta
        });
      }
    );
  });
}

function getTotalMes() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT IFNULL(SUM(total), 0) as totalMes
       FROM ventas
       WHERE fecha >= date('now','start of month')
         AND fecha <= date('now','localtime')`,
      [],
      (err, row) => {
        if (err) return reject(err);

        resolve({
          totalMes: row.totalMes || 0
        });
      }
    );
  });
}

module.exports = {
  registrarVenta,
  getTotales,
  getTotalMes
};