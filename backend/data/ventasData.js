function registrarVenta(data) {
  return new Promise((resolve, reject) => {
    const { items, metodo_pago } = data;

    if (!items || items.length === 0) {
      return reject(new Error("No hay productos en la venta"));
    }

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // 🟢 1. Crear venta
      db.run(
        `INSERT INTO ventas (fecha, hora, medio_pago, total, estado) 
         VALUES (DATE('now','localtime'), TIME('now','localtime'), ?, 0, 'ABIERTA')`,
        [metodo_pago],
        function (err) {
          if (err) return reject(err);

          const ventaId = this.lastID;

          // 🟢 2. Insertar detalles
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

          // 🟢 3. cerrar venta (trigger calcula total)
          db.run(
            "UPDATE ventas SET estado = 'CERRADA' WHERE id_venta = ?",
            [ventaId],
            (err) => {
              if (err) return reject(err);

              // 🟢 4. obtener total final
              db.get(
                "SELECT total FROM ventas WHERE id_venta = ?",
                [ventaId],
                (err, row) => {
                  if (err) return reject(err);

                  db.run("COMMIT");

                  resolve({
                    ventaId,
                    total: row?.total || 0
                  });
                }
              );
            }
          );
        }
      );
    });
  });
}