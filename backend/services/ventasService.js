const db = require("../db");
const { encolarFacturacionVenta } = require("./facturacionQueueService");

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

                        const ventaRegistrada = {
                          id_venta,
                          subtotal,
                          total: totalFinal,
                          descuento_porcentaje: descuentoPorcentaje,
                          descuento_monto: descuentoMonto,
                          precios,
                        };

                        encolarFacturacionVenta(id_venta, data)
                          .then((facturacion) => {
                            resolve({
                              ...ventaRegistrada,
                              facturacion,
                            });
                          })
                          .catch((facturacionErr) => {
                            console.error(
                              "Venta guardada, pero no se pudo encolar facturacion:",
                              facturacionErr.message
                            );

                            resolve({
                              ...ventaRegistrada,
                              facturacion: {
                                queued: false,
                                estado: "ERROR_COLA",
                                error: facturacionErr.message,
                              },
                            });
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

function getPeriodoStats(desde, hasta) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT
        COUNT(*) as clientes,
        IFNULL(SUM(total), 0) as total,
        COUNT(CASE WHEN descuento_monto > 0 THEN 1 END) as descuentosOtorgados,
        IFNULL(SUM(descuento_monto), 0) as totalDescuentos
       FROM ventas
       WHERE fecha >= ? AND fecha <= ?`,
      [desde, hasta],
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

function getFechaLocal() {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(fecha, dias) {
  const date = new Date(`${fecha}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().slice(0, 10);
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function isMonth(value) {
  return /^\d{4}-\d{2}$/.test(value || "");
}

function normalizarFecha(value, fallback) {
  return isDate(value) ? value : fallback;
}

function normalizarMes(value, fallbackFecha) {
  return isMonth(value) ? value : fallbackFecha.slice(0, 7);
}

function getWeekRange(fecha) {
  const date = new Date(`${fecha}T12:00:00Z`);
  const day = date.getUTCDay() || 7;
  const inicio = addDays(fecha, 1 - day);

  return {
    inicio,
    fin: addDays(inicio, 6),
  };
}

function getMonthRange(month) {
  const inicio = `${month}-01`;
  const date = new Date(`${inicio}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);

  return {
    inicio,
    fin: date.toISOString().slice(0, 10),
  };
}

function getPreviousMonth(month) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

function getComparativa(actual, comparado) {
  return {
    clientes: calcularVariacion(actual.clientes, comparado.clientes),
    total: calcularVariacion(actual.total, comparado.total),
    ticketPromedio: calcularVariacion(
      actual.ticketPromedio,
      comparado.ticketPromedio
    ),
    descuentosOtorgados: calcularVariacion(
      actual.descuentosOtorgados,
      comparado.descuentosOtorgados
    ),
    totalDescuentos: calcularVariacion(
      actual.totalDescuentos,
      comparado.totalDescuentos
    ),
  };
}

async function getPeriodoComparado(actualRange, compararRange) {
  const [actual, comparado] = await Promise.all([
    getPeriodoStats(actualRange.inicio, actualRange.fin),
    getPeriodoStats(compararRange.inicio, compararRange.fin),
  ]);

  return {
    actual,
    comparado,
    variacion: getComparativa(actual, comparado),
  };
}

function getVentasPorHora(fecha) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT
        SUBSTR(hora, 1, 2) as hora,
        COUNT(*) as ventas,
        IFNULL(SUM(total), 0) as total
       FROM ventas
       WHERE fecha = ?
       GROUP BY SUBSTR(hora, 1, 2)
       ORDER BY hora ASC`,
      [fecha],
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

function getProductosPorMonto(desde, hasta, limite = 8) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT
        p.id_producto as id,
        p.nombre_producto as nombre,
        IFNULL(SUM(dv.cantidad * dv.precio_unitario), 0) as monto,
        IFNULL(SUM(dv.cantidad), 0) as cantidad
       FROM detalle_venta dv
       JOIN ventas v ON v.id_venta = dv.id_venta
       JOIN productos p ON p.id_producto = dv.id_producto
       WHERE v.fecha >= ? AND v.fecha <= ?
       GROUP BY p.id_producto, p.nombre_producto
       ORDER BY monto DESC
       LIMIT ?`,
      [desde, hasta, limite],
      (err, rows) => {
        if (err) {
          return reject(err);
        }

        resolve(
          rows.map((row) => ({
            id: row.id,
            nombre: row.nombre,
            monto: Number(row.monto || 0),
            cantidad: Number(row.cantidad || 0),
          }))
        );
      }
    );
  });
}

async function getDashboardStats(options = {}) {
  const hoy = getFechaLocal();
  const dia = normalizarFecha(options.dia, hoy);
  const diaComparar = normalizarFecha(options.diaComparar, addDays(dia, -1));
  const semana = normalizarFecha(options.semana, hoy);
  const semanaComparar = normalizarFecha(options.semanaComparar, addDays(semana, -7));
  const mes = normalizarMes(options.mes, hoy);
  const mesComparar = normalizarMes(options.mesComparar, getPreviousMonth(mes));
  const horaDia = normalizarFecha(options.horaDia, dia);
  const horaComparar = normalizarFecha(options.horaComparar, diaComparar);

  const diaRange = { inicio: dia, fin: dia };
  const diaCompararRange = { inicio: diaComparar, fin: diaComparar };
  const semanaRange = getWeekRange(semana);
  const semanaCompararRange = getWeekRange(semanaComparar);
  const mesRange = getMonthRange(mes);
  const mesCompararRange = getMonthRange(mesComparar);

  const [
    diaStats,
    semanaStats,
    mesStats,
    ventasHoraActual,
    ventasHoraComparada,
    productosPorMonto,
  ] = await Promise.all([
    getPeriodoComparado(diaRange, diaCompararRange),
    getPeriodoComparado(semanaRange, semanaCompararRange),
    getPeriodoComparado(mesRange, mesCompararRange),
    getVentasPorHora(horaDia),
    getVentasPorHora(horaComparar),
    getProductosPorMonto(mesRange.inicio, mesRange.fin),
  ]);

  return {
    filtros: {
      dia,
      diaComparar,
      semana,
      semanaComparar,
      mes,
      mesComparar,
      horaDia,
      horaComparar,
      rangos: {
        dia: diaRange,
        diaComparar: diaCompararRange,
        semana: semanaRange,
        semanaComparar: semanaCompararRange,
        mes: mesRange,
        mesComparar: mesCompararRange,
      },
    },
    dia: diaStats,
    semana: semanaStats,
    mes: mesStats,
    ventasPorHora: {
      actual: ventasHoraActual,
      comparada: ventasHoraComparada,
    },
    productosPorMonto,
  };
}

module.exports = { registrarVenta, getTotales, getTotalMes, getDashboardStats };
