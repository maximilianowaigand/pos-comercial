
const db = require("../db");

// 🧾 Registrar venta con detalle
function registrarVenta(data) {
  return new Promise((resolve, reject) => {
    const { items, metodo_pago } = data;

    // 1️⃣ Consultar precio_base de cada producto en la DB
    const ids = items.map(i => i.producto_id);
    const placeholders = ids.map(() => "?").join(", ");

    db.all(
      `SELECT id_producto, precio_base FROM productos WHERE id_producto IN (${placeholders})`,
      ids,
      (err, productos) => {
        if (err) return reject(err);

        const precios = {};
        productos.forEach(p => {
          precios[p.id_producto] = p.precio_base;
        });

        for (const item of items) {
          if (precios[item.producto_id] === undefined) {
            return reject(new Error(`Producto ${item.producto_id} no encontrado`));
          }
        }

        // 2️⃣ Iniciar transacción con callback explícito (sin db.serialize)
        db.run("BEGIN TRANSACTION", (err) => {
          if (err) return reject(err);

          db.run(
            `INSERT INTO ventas (fecha, hora, medio_pago, total, estado)
             VALUES (DATE('now','localtime'), TIME('now','localtime'), ?, 0, 'CERRADA')`,
            [metodo_pago],
            function (err) {
              if (err) {
                return db.run("ROLLBACK", () => reject(err));
              }

              const id_venta = this.lastID;

              // 3️⃣ Insertar items uno por uno con callbacks encadenados
              const insertarItems = (index) => {
                if (index >= items.length) {
                  // Todos insertados → COMMIT
                  return db.run("COMMIT", (err) => {
                    if (err) {
                      return db.run("ROLLBACK", () => reject(err));
                    }

                    // 4️⃣ Leer total calculado por el trigger
                    db.get(
                      `SELECT total FROM ventas WHERE id_venta = ?`,
                      [id_venta],
                      (err, row) => {
                        if (err) return reject(err);
                        resolve({
                          id_venta,
                          total: row.total,
                          precios
                        });
                      }
                    );
                  });
                }

                const item = items[index];
                db.run(
                  `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario)
                   VALUES (?, ?, ?, ?)`,
                  [
                    id_venta,
                    item.producto_id,
                    item.cantidad,
                    item.precio_unitario ?? precios[item.producto_id]
                  ],
                  (err) => {
                    if (err) {
                      return db.run("ROLLBACK", () => reject(err));
                    }
                    insertarItems(index + 1);
                  }
                );
              };

              insertarItems(0);
            }
          );
        });
      }
    );
  });
}

// 📊 Totales del día
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

// 📊 Total del mes
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
        resolve({ totalMes: row.totalMes || 0 });
      }
    );
  });
}

module.exports = { registrarVenta, getTotales, getTotalMes };