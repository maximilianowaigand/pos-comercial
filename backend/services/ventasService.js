const db = require("../db");
const { encolarFacturacionVenta } = require("./facturacionQueueService");

function registrarVenta(data) {
  return new Promise((resolve, reject) => {
    const { items, perfil_facturacion } = data;
    const descuentoPorcentaje = Math.min(
      100,
      Math.max(0, Number(data.descuento_porcentaje) || 0)
    );

    const ids = items.map((i) => i.producto_id);
    const placeholders = ids.map(() => "?").join(", ");

    db.all(
      `SELECT id_producto, precio_base, costo_base FROM productos WHERE id_producto IN (${placeholders})`,
      ids,
      (err, productos) => {
        if (err) {
          return reject(err);
        }

        const precios = {};
        const costos = {};
        productos.forEach((p) => {
          precios[p.id_producto] = p.precio_base;
          costos[p.id_producto] = Number(p.costo_base || 0);
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
                  estado,
                  perfil_facturacion
                ) VALUES (
                  DATE('now','localtime'),
                  TIME('now','localtime'),
                  ?,
                  0,
                  0,
                  0,
                  'CERRADA',
                  ?
                )`,
                [data.medio_pago || "mixto", perfil_facturacion || null],
            
            
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

                  const pagos = Array.isArray(data.pagos) && data.pagos.length
                    ? data.pagos
                    : [{ medio_pago: data.medio_pago, monto: totalFinal }];
                  const pagosNormalizados = pagos.map((pago) => ({
                    medio_pago: String(pago.medio_pago || "").trim().toLowerCase(),
                    monto: Number(pago.monto),
                  }));
                  const metodosValidos = new Set(["efectivo", "tarjeta", "transferencia"]);
                  const pagosInvalidos = pagosNormalizados.some(
                    (pago) => !metodosValidos.has(pago.medio_pago) || !Number.isFinite(pago.monto) || pago.monto <= 0
                  );
                  const totalPagos = Number(pagosNormalizados.reduce((acc, pago) => acc + pago.monto, 0).toFixed(2));

                  if (pagosInvalidos || totalPagos !== totalFinal) {
                    return db.run("ROLLBACK", () => reject(new Error("Los pagos deben ser positivos y sumar el total de la venta")));
                  }

                  const medioPago = pagosNormalizados.length === 1
                    ? pagosNormalizados[0].medio_pago
                    : "mixto";

                  return db.run(
                    `UPDATE ventas
                     SET total = ?, descuento_porcentaje = ?, descuento_monto = ?, medio_pago = ?
                     WHERE id_venta = ?`,
                    [totalFinal, descuentoPorcentaje, descuentoMonto, medioPago, id_venta],
                    (updateErr) => {
                      if (updateErr) {
                        return db.run("ROLLBACK", () => reject(updateErr));
                      }

                      const insertarPagos = (index) => {
                        if (index >= pagosNormalizados.length) {
                          return db.run("COMMIT", (commitErr) => {
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

                        encolarFacturacionVenta(id_venta, {
                          ...data,
                          metodo_pago: medioPago,
                          medios_pago: pagosNormalizados.map((pago) => pago.medio_pago),
                        })
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

                        const pago = pagosNormalizados[index];
                        db.run(
                          `INSERT INTO pagos_venta (id_venta, medio_pago, monto) VALUES (?, ?, ?)`,
                          [id_venta, pago.medio_pago, pago.monto],
                          (pagoErr) => {
                            if (pagoErr) return db.run("ROLLBACK", () => reject(pagoErr));
                            insertarPagos(index + 1);
                          }
                        );
                      };

                      insertarPagos(0);
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
                  `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, costo_unitario)
                   VALUES (?, ?, ?, ?, ?)`,
                  [id_venta, item.producto_id, cantidad, precioUnitario, costos[item.producto_id]],
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
      `SELECT medio_pago, SUM(monto) as totalDia
       FROM (
         SELECT pv.medio_pago, pv.monto
         FROM pagos_venta pv
         JOIN ventas v ON v.id_venta = pv.id_venta
         WHERE DATE(v.fecha) = DATE('now')
         UNION ALL
         SELECT v.medio_pago, v.total as monto
         FROM ventas v
         WHERE DATE(v.fecha) = DATE('now')
           AND NOT EXISTS (SELECT 1 FROM pagos_venta pv WHERE pv.id_venta = v.id_venta)
       )
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

function addMonths(month, amount) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
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

function getRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows);
    });
  });
}

function porcentaje(valor, total) {
  if (!total) return 0;
  return (Number(valor || 0) / Number(total)) * 100;
}

async function getPatronesConsumo(hasta) {
  const desde = addDays(hasta, -89);
  const [cobertura] = await getRows(
    `SELECT COUNT(DISTINCT fecha) as dias, COUNT(*) as ventas, IFNULL(SUM(total), 0) as monto
     FROM ventas
     WHERE fecha >= ? AND fecha <= ?`,
    [desde, hasta]
  );

  const dias = Number(cobertura?.dias || 0);
  const ventas = Number(cobertura?.ventas || 0);

  if (dias < 14 || ventas < 20) {
    return {
      suficientes: false,
      dias,
      ventas,
      desde,
      hasta,
      mensaje: "Se necesitan al menos 14 dias con ventas y 20 tickets para detectar patrones confiables.",
      hallazgos: [],
    };
  }

  const actualDesde = addDays(hasta, -29);
  const anteriorHasta = addDays(actualDesde, -1);
  const anteriorDesde = addDays(anteriorHasta, -29);
  const [
    productos,
    diasSemana,
    horas,
    mediosPago,
    periodoActual,
    periodoAnterior,
  ] = await Promise.all([
    getRows(
      `SELECT p.nombre_producto as nombre, SUM(dv.cantidad) as cantidad,
              SUM(dv.cantidad * dv.precio_unitario) as monto
       FROM detalle_venta dv
       JOIN ventas v ON v.id_venta = dv.id_venta
       JOIN productos p ON p.id_producto = dv.id_producto
       WHERE v.fecha >= ? AND v.fecha <= ?
       GROUP BY p.id_producto, p.nombre_producto
       ORDER BY cantidad DESC, monto DESC
       LIMIT 1`,
      [desde, hasta]
    ),
    getRows(
      `SELECT strftime('%w', fecha) as dia, COUNT(*) as ventas, SUM(total) as monto
       FROM ventas
       WHERE fecha >= ? AND fecha <= ?
       GROUP BY strftime('%w', fecha)
       ORDER BY monto DESC
       LIMIT 1`,
      [desde, hasta]
    ),
    getRows(
      `SELECT SUBSTR(hora, 1, 2) as hora, COUNT(*) as ventas, SUM(total) as monto
       FROM ventas
       WHERE fecha >= ? AND fecha <= ?
       GROUP BY SUBSTR(hora, 1, 2)
       ORDER BY ventas DESC, monto DESC
       LIMIT 1`,
      [desde, hasta]
    ),
    getRows(
      `SELECT medio_pago as medioPago, COUNT(*) as ventas, SUM(total) as monto
       FROM ventas
       WHERE fecha >= ? AND fecha <= ?
       GROUP BY medio_pago
       ORDER BY ventas DESC, monto DESC
       LIMIT 1`,
      [desde, hasta]
    ),
    getPeriodoStats(actualDesde, hasta),
    getPeriodoStats(anteriorDesde, anteriorHasta),
  ]);

  const nombresDias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const producto = productos[0];
  const diaSemana = diasSemana[0];
  const hora = horas[0];
  const medioPago = mediosPago[0];
  const hallazgos = [];

  if (producto) {
    hallazgos.push({
      tipo: "producto",
      titulo: "Producto con mayor salida",
      detalle: `${producto.nombre}: ${Number(producto.cantidad || 0)} unidades vendidas en los ultimos 90 dias.`,
    });
  }

  if (diaSemana) {
    hallazgos.push({
      tipo: "dia",
      titulo: "Dia mas fuerte",
      detalle: `${nombresDias[Number(diaSemana.dia)]}: concentra el ${porcentaje(diaSemana.monto, cobertura.monto).toFixed(1)}% de la facturacion de los ultimos 90 dias.`,
    });
  }

  if (hora) {
    hallazgos.push({
      tipo: "hora",
      titulo: "Horario con mas tickets",
      detalle: `Entre las ${hora.hora}:00 y las ${hora.hora}:59 se registran mas compras (${Number(hora.ventas || 0)} tickets).`,
    });
  }

  if (medioPago) {
    hallazgos.push({
      tipo: "pago",
      titulo: "Medio de pago preferido",
      detalle: `${medioPago.medioPago}: ${porcentaje(medioPago.ventas, ventas).toFixed(1)}% de los tickets del periodo.`,
    });
  }

  if (periodoAnterior.total > 0) {
    const variacion = ((periodoActual.total - periodoAnterior.total) / periodoAnterior.total) * 100;
    hallazgos.push({
      tipo: "tendencia",
      titulo: "Tendencia reciente",
      detalle: `Los ultimos 30 dias ${variacion >= 0 ? "subieron" : "bajaron"} ${Math.abs(variacion).toFixed(1)}% frente a los 30 dias anteriores.`,
    });
  }

  return {
    suficientes: true,
    dias,
    ventas,
    desde,
    hasta,
    hallazgos,
  };
}

async function getComparacionMensual(mesHasta) {
  const mesesEsperados = Array.from({ length: 12 }, (_, index) =>
    addMonths(mesHasta, index - 11)
  );
  const desde = mesesEsperados[0];
  const hasta = `${mesHasta}-31`;
  const rows = await getRows(
    `SELECT SUBSTR(fecha, 1, 7) as mes, COUNT(*) as tickets, IFNULL(SUM(total), 0) as total
     FROM ventas
     WHERE fecha >= ? AND fecha <= ?
     GROUP BY SUBSTR(fecha, 1, 7)
     ORDER BY mes ASC`,
    [`${desde}-01`, hasta]
  );
  const datosPorMes = new Map(
    rows.map((row) => [
      row.mes,
      {
        mes: row.mes,
        tickets: Number(row.tickets || 0),
        clientes: Number(row.tickets || 0),
        total: Number(row.total || 0),
      },
    ])
  );
  const meses = mesesEsperados.map((mes, index) => {
    const actual = datosPorMes.get(mes) || { mes, tickets: 0, clientes: 0, total: 0 };
    const anterior = index > 0 ? datosPorMes.get(mesesEsperados[index - 1]) : null;
    const variacion = anterior?.total > 0
      ? ((actual.total - anterior.total) / anterior.total) * 100
      : null;

    return { ...actual, variacion };
  });
  const mesesConVentas = meses.filter((mes) => mes.tickets > 0);
  const cambios = meses.filter((mes) => mes.tickets > 0 && mes.variacion !== null);

  return {
    desde,
    hasta: mesHasta,
    meses,
    mesesConVentas: mesesConVentas.length,
    mesMasFuerte: mesesConVentas.reduce(
      (mejor, mes) => (!mejor || mes.total > mejor.total ? mes : mejor),
      null
    ),
    mesMasBajo: mesesConVentas.reduce(
      (menor, mes) => (!menor || mes.total < menor.total ? mes : menor),
      null
    ),
    mayorSuba: cambios.reduce(
      (mejor, mes) => (!mejor || mes.variacion > mejor.variacion ? mes : mejor),
      null
    ),
    mayorCaida: cambios.reduce(
      (peor, mes) => (!peor || mes.variacion < peor.variacion ? mes : peor),
      null
    ),
  };
}

async function getImpactoClima(desde, hasta) {
  const [cobertura] = await getRows(
    `SELECT COUNT(DISTINCT v.fecha) as dias
     FROM ventas v
     JOIN clima_diario c ON c.fecha = v.fecha
     WHERE v.fecha >= ? AND v.fecha <= ?`,
    [desde, hasta]
  );
  const dias = Number(cobertura?.dias || 0);

  if (dias < 14) {
    return {
      suficientes: false,
      dias,
      mensaje: "Se necesitan al menos 14 dias con clima y ventas registrados para medir su impacto.",
    };
  }

  const condiciones = await getRows(
    `SELECT
       CASE WHEN COALESCE(c.lluvia_mm, 0) > 0 OR COALESCE(c.prob_lluvia, 0) >= 50
         THEN 'lluvia' ELSE 'seco' END as condicion,
       COUNT(DISTINCT v.fecha) as dias,
       IFNULL(SUM(v.total), 0) as total,
       AVG((COALESCE(c.temp_min, 0) + COALESCE(c.temp_max, 0)) / 2.0) as temperaturaPromedio
     FROM ventas v
     JOIN clima_diario c ON c.fecha = v.fecha
     WHERE v.fecha >= ? AND v.fecha <= ?
     GROUP BY condicion`,
    [desde, hasta]
  );
  const porCondicion = new Map(
    condiciones.map((row) => [
      row.condicion,
      {
        dias: Number(row.dias || 0),
        total: Number(row.total || 0),
        promedioDiario: Number(row.total || 0) / Math.max(1, Number(row.dias || 0)),
        temperaturaPromedio: Number(row.temperaturaPromedio || 0),
      },
    ])
  );
  const lluvia = porCondicion.get("lluvia") || null;
  const seco = porCondicion.get("seco") || null;
  const comparable = lluvia?.dias >= 3 && seco?.dias >= 3 && seco.promedioDiario > 0;
  const variacionLluvia = comparable
    ? ((lluvia.promedioDiario - seco.promedioDiario) / seco.promedioDiario) * 100
    : null;

  return {
    suficientes: comparable,
    dias,
    lluvia,
    seco,
    variacionLluvia,
    mensaje: comparable
      ? null
      : "Aun faltan suficientes dias de lluvia y dias secos para una comparacion confiable.",
  };
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
  const hastaAnalisis = mesRange.fin < hoy ? mesRange.fin : hoy;
  const desdeAnalisis = addDays(hastaAnalisis, -89);

  const [
    diaStats,
    semanaStats,
    mesStats,
    ventasHoraActual,
    ventasHoraComparada,
    productosPorMonto,
    patronesConsumo,
    comparacionMensual,
    impactoClima,
  ] = await Promise.all([
    getPeriodoComparado(diaRange, diaCompararRange),
    getPeriodoComparado(semanaRange, semanaCompararRange),
    getPeriodoComparado(mesRange, mesCompararRange),
    getVentasPorHora(horaDia),
    getVentasPorHora(horaComparar),
    getProductosPorMonto(mesRange.inicio, mesRange.fin),
    getPatronesConsumo(hastaAnalisis),
    getComparacionMensual(mes),
    getImpactoClima(desdeAnalisis, hastaAnalisis),
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
    patronesConsumo,
    comparacionMensual,
    impactoClima,
  };
}

module.exports = { registrarVenta, getTotales, getTotalMes, getDashboardStats };
