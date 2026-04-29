const db = require("../db");

function registrarVenta(data) {
  return new Promise((resolve, reject) => {
    const { items, metodo_pago } = data;
    const descuentoPorcentaje = Math.min(
      100,
      Math.max(0, Number(data.descuento_porcentaje) || 0)
    );

    const ids = items.map((i) => i.producto_id);
    const placeholders = ids.map(() => "?").join(", ");

    db.all(
      `SELECT id_producto, precio_base FROM productos WHERE id_producto IN (${placeholders})`,
      ids,
      (err, productos) => {
        if (err) {
          return reject(err);
        }

        const precios = {};
        productos.forEach((p) => {
          precios[p.id_producto] = p.precio_base;
        });

        for (const item of items) {
          if (precios[item.producto_id] === undefined) {
            return reject(new Error(`Producto ${item.producto_id} no encontrado`));
          }
        }

        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) {
            return reject(beginErr);
          }

          db.run(
            `INSERT INTO ventas (
              fecha,
              hora,
              medio_pago,
              total,
              descuento_porcentaje,
              descuento_monto,
              estado
            ) VALUES (DATE('now','localtime'), TIME('now','localtime'), ?, 0, 0, 0, 'CERRADA')`,
            [metodo_pago],
            function onVentaInsert(insertErr) {
              if (insertErr) {
                return db.run("ROLLBACK", () => reject(insertErr));
              }

              const id_venta = this.lastID;
              let subtotal = 0;

              const insertarItems = (index) => {
                if (index >= items.length) {
                  const descuentoMonto = Number(
                    (subtotal * (descuentoPorcentaje / 100)).toFixed(2)
                  );
                  const totalFinal = Number((subtotal - descuentoMonto).toFixed(2));

                  return db.run(
                    `UPDATE ventas
                     SET total = ?, descuento_porcentaje = ?, descuento_monto = ?
                     WHERE id_venta = ?`,
                    [totalFinal, descuentoPorcentaje, descuentoMonto, id_venta],
                    (updateErr) => {
                      if (updateErr) {
                        return db.run("ROLLBACK", () => reject(updateErr));
                      }

                      db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                          return db.run("ROLLBACK", () => reject(commitErr));
                        }

                        resolve({
                          id_venta,
                          subtotal,
                          total: totalFinal,
                          descuento_porcentaje: descuentoPorcentaje,
                          descuento_monto: descuentoMonto,
                          precios,
                        });
                      });
                    }
                  );
                }

                const item = items[index];
                const precioUnitario = Number(
                  item.precio_unitario ?? precios[item.producto_id]
                ) || 0;
                const cantidad = Number(item.cantidad) || 0;

                subtotal += precioUnitario * cantidad;

                db.run(
                  `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario)
                   VALUES (?, ?, ?, ?)`,
                  [id_venta, item.producto_id, cantidad, precioUnitario],
                  (itemErr) => {
                    if (itemErr) {
                      return db.run("ROLLBACK", () => reject(itemErr));
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

function getTotales() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT medio_pago, SUM(total) as totalDia
       FROM ventas
       WHERE DATE(fecha) = DATE('now')
       GROUP BY medio_pago`,
      [],
      (err, rows) => {
        if (err) {
          return reject(err);
        }

        let efectivo = 0;
        let transferencia = 0;
        let tarjeta = 0;

        rows.forEach((r) => {
          if (r.medio_pago === "efectivo") efectivo = r.totalDia;
          if (r.medio_pago === "transferencia") transferencia = r.totalDia;
          if (r.medio_pago === "tarjeta") tarjeta = r.totalDia;
        });

        resolve({
          totalDia: efectivo + transferencia + tarjeta,
          efectivo,
          transferencia,
          tarjeta,
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
        if (err) {
          return reject(err);
        }
        resolve({ totalMes: row.totalMes || 0 });
      }
    );
  });
}

function getPeriodoStats(desdeExpr, hastaExpr) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT
        COUNT(*) as clientes,
        IFNULL(SUM(total), 0) as total,
        COUNT(CASE WHEN descuento_monto > 0 THEN 1 END) as descuentosOtorgados,
        IFNULL(SUM(descuento_monto), 0) as totalDescuentos
       FROM ventas
       WHERE fecha >= ${desdeExpr} AND fecha <= ${hastaExpr}`,
      (err, row) => {
        if (err) {
          return reject(err);
        }

        const clientes = Number(row?.clientes || 0);
        const total = Number(row?.total || 0);
        const ticketPromedio = clientes > 0 ? total / clientes : 0;

        resolve({
          clientes,
          total,
          ticketPromedio,
          descuentosOtorgados: Number(row?.descuentosOtorgados || 0),
          totalDescuentos: Number(row?.totalDescuentos || 0),
        });
      }
    );
  });
}

function calcularVariacion(actual, anterior) {
  if (!anterior) {
    return actual > 0 ? 100 : 0;
  }

  return ((actual - anterior) / anterior) * 100;
}

function getVentasPorHora() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT
        SUBSTR(hora, 1, 2) as hora,
        COUNT(*) as ventas,
        IFNULL(SUM(total), 0) as total
       FROM ventas
       WHERE DATE(fecha) = DATE('now','localtime')
       GROUP BY SUBSTR(hora, 1, 2)
       ORDER BY hora ASC`,
      [],
      (err, rows) => {
        if (err) {
          return reject(err);
        }

        const mapa = new Map(
          rows.map((row) => [
            row.hora,
            {
              hora: `${row.hora}:00`,
              ventas: Number(row.ventas || 0),
              total: Number(row.total || 0),
            },
          ])
        );

        const serie = Array.from({ length: 15 }, (_, offset) => {
          const index = offset + 7;
          const hora = String(index).padStart(2, "0");
          return (
            mapa.get(hora) ?? {
              hora: `${hora}:00`,
              ventas: 0,
              total: 0,
            }
          );
        });

        const horaPico = serie.reduce(
          (mejor, actual) => (actual.ventas > mejor.ventas ? actual : mejor),
          { hora: "00:00", ventas: 0, total: 0 }
        );

        resolve({
          serie,
          horaPico,
        });
      }
    );
  });
}

async function getDashboardStats() {
  const hoy = await getPeriodoStats("date('now','localtime')", "date('now','localtime')");
  const semanaActual = await getPeriodoStats(
    "date('now','-6 days','localtime')",
    "date('now','localtime')"
  );
  const semanaAnterior = await getPeriodoStats(
    "date('now','-13 days','localtime')",
    "date('now','-7 days','localtime')"
  );
  const mesActual = await getPeriodoStats(
    "date('now','start of month','localtime')",
    "date('now','localtime')"
  );
  const mesAnterior = await getPeriodoStats(
    "date('now','start of month','-1 month','localtime')",
    "date('now','start of month','-1 day','localtime')"
  );
  const ventasPorHora = await getVentasPorHora();

  return {
    hoy,
    semanaActual,
    semanaAnterior,
    mesActual,
    mesAnterior,
    ventasPorHora,
    comparativas: {
      clientesSemana: calcularVariacion(
        semanaActual.clientes,
        semanaAnterior.clientes
      ),
      ticketPromedioSemana: calcularVariacion(
        semanaActual.ticketPromedio,
        semanaAnterior.ticketPromedio
      ),
      clientesMes: calcularVariacion(mesActual.clientes, mesAnterior.clientes),
      ticketPromedioMes: calcularVariacion(
        mesActual.ticketPromedio,
        mesAnterior.ticketPromedio
      ),
    },
  };
}

module.exports = { registrarVenta, getTotales, getTotalMes, getDashboardStats };
