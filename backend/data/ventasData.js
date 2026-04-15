const db = require("../db");

// ======================
// 🧾 REGISTRAR VENTA
// ======================
function registrarVenta(data) {
  return new Promise((resolve, reject) => {
    const { items, metodo_pago } = data;

    if (!items || items.length === 0) {
      return reject(new Error("No hay productos en la venta"));
    }

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // 1️⃣ Crear venta
      db.run(
        `INSERT INTO ventas (fecha, hora, medio_pago, estado) 
         VALUES (DATE('now', 'localtime'), TIME('now', 'localtime'), ?, 'ABIERTA')`,
        [metodo_pago],
        function (err) {
          if (err) return reject(err);

          const ventaId = this.lastID;

          // 2️⃣ Insertar detalles
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
              item.precio_unitario || 0
            ]);
          }

          stmt.finalize();

          // 3️⃣ Cerrar venta (dispara trigger de total)
          db.run(
            "UPDATE ventas SET estado = 'CERRADA' WHERE id_venta = ?",
            [ventaId],
            (err) => {
              if (err) return reject(err);

              // 4️⃣ Obtener total
              db.get(
                "SELECT total FROM ventas WHERE id_venta = ?",
                [ventaId],
                (err, row) => {
                  if (err) return reject(err);

                  db.run("COMMIT");

                  const total = row?.total || 0;
                  console.log("TOTAL calculado:", total);

                  resolve({ ventaId, total });
                }
              );
            }
          );
        }
      );
    });
  });
}

// ======================
// 📊 GET TOTALES
// ======================
function getTotales() {
  return new Promise((resolve, reject) => {

    // 🔹 Totales del día
    db.all(
      `
      SELECT 
        medio_pago,
        IFNULL(SUM(total), 0) as totalDia
      FROM ventas
      WHERE DATE(fecha) = DATE('now')
        AND estado = 'CERRADA'
      GROUP BY medio_pago
      `,
      [],
      (err, dia) => {
        if (err) return reject(err);

        // 🔹 Total del mes
        db.get(
          `
          SELECT IFNULL(SUM(total),0) as totalMes
          FROM ventas
          WHERE strftime('%m', fecha) = strftime('%m', 'now')
          AND strftime('%Y', fecha) = strftime('%Y', 'now')
          `,
          [],
          (err, mes) => {
            if (err) return reject(err);

            let efectivo = 0;
            let transferencia = 0;
            let debito = 0;

            dia.forEach(row => {
              if (row.medio_pago === 'efectivo') efectivo = row.totalDia;
              if (row.medio_pago === 'transferencia') transferencia = row.totalDia;
              if (row.medio_pago === 'tarjeta') debito = row.totalDia;
            });

            resolve({
              totalDia: efectivo + transferencia + debito,
              totalMes: mes.totalMes,
              efectivo,
              transferencia,
              debito
            });
          }
        );
      }
    );
  });
}

module.exports = { 
  registrarVenta,
  getTotales
};