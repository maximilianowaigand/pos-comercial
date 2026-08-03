const db = require("../db");

const TIPOS = new Set(["INGRESO", "EGRESO"]);
const MEDIOS = new Set(["efectivo", "transferencia", "tarjeta"]);
const ESTADOS = new Set(["PAGADO", "PENDIENTE", "INGRESADO"]);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) return reject(error);
      resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
  });
}

function getMesActual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function normalizarMes(mes) {
  return /^\d{4}-\d{2}$/.test(mes || "") ? mes : getMesActual();
}

function sumarMeses(mes, cantidad) {
  const [year, month] = mes.split("-").map(Number);
  const fecha = new Date(Date.UTC(year, month - 1 + cantidad, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

function fechaDelMes(mes, dia) {
  const [year, month] = mes.split("-").map(Number);
  const ultimoDia = new Date(year, month, 0).getDate();
  return `${mes}-${String(Math.min(Math.max(1, Number(dia)), ultimoDia)).padStart(2, "0")}`;
}

function normalizarMovimiento(data = {}) {
  const tipo = String(data.tipo || "").toUpperCase();
  const categoria = String(data.categoria || "").trim();
  const descripcion = String(data.descripcion || "").trim();
  const proveedor = tipo === "EGRESO" ? String(data.proveedor || "").trim() : "";
  const monto = Number(data.monto);
  const medioPago = String(data.medio_pago || "").toLowerCase();
  const estadoSolicitado = String(data.estado || "PENDIENTE").toUpperCase();
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(data.fecha || "") ? data.fecha : new Date().toISOString().slice(0, 10);
  const fechaVencimiento = /^\d{4}-\d{2}-\d{2}$/.test(data.fecha_vencimiento || "") ? data.fecha_vencimiento : null;

  if (!TIPOS.has(tipo) || !categoria || !Number.isFinite(monto) || monto <= 0 || !MEDIOS.has(medioPago) || !ESTADOS.has(estadoSolicitado)) {
    throw new Error("Datos de movimiento inválidos");
  }

  return {
    tipo,
    categoria,
    descripcion: descripcion || null,
    proveedor: proveedor || null,
    monto: Number(monto.toFixed(2)),
    medioPago,
    estado: estadoSolicitado === "PENDIENTE" ? "PENDIENTE" : "PAGADO",
    fecha,
    fechaVencimiento,
  };
}

async function crearMovimiento(data = {}) {
  const movimiento = normalizarMovimiento(data);
  let idRecurrencia = null;

  if (data.recurrente === true) {
    const fechaBase = movimiento.fechaVencimiento || movimiento.fecha;
    idRecurrencia = (await run(
      `INSERT INTO movimientos_recurrentes
       (tipo, categoria, descripcion, proveedor, monto, medio_pago, dia_vencimiento)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [movimiento.tipo, movimiento.categoria, movimiento.descripcion, movimiento.proveedor, movimiento.monto, movimiento.medioPago, Number(fechaBase.slice(8, 10))]
    )).lastID;
  }

  const result = await run(
    `INSERT INTO movimientos_caja
     (tipo, categoria, descripcion, proveedor, monto, medio_pago, estado, origen, fecha, fecha_vencimiento, id_recurrencia)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movimiento.tipo, movimiento.categoria, movimiento.descripcion, movimiento.proveedor, movimiento.monto,
      movimiento.medioPago, movimiento.estado, idRecurrencia ? "RECURRENTE" : "MANUAL",
      movimiento.fecha, movimiento.fechaVencimiento, idRecurrencia,
    ]
  );

  return { id_movimiento: result.lastID, id_recurrencia: idRecurrencia };
}

async function generarMovimientosRecurrentes(mes) {
  const recurrentes = await all("SELECT * FROM movimientos_recurrentes WHERE activo = 1");
  for (const recurrente of recurrentes) {
    const existente = await all(
      "SELECT id_movimiento FROM movimientos_caja WHERE id_recurrencia = ? AND substr(fecha, 1, 7) = ? LIMIT 1",
      [recurrente.id_recurrencia, mes]
    );
    if (existente.length) continue;

    const vencimiento = fechaDelMes(mes, recurrente.dia_vencimiento);
    await run(
      `INSERT INTO movimientos_caja
       (tipo, categoria, descripcion, proveedor, monto, medio_pago, estado, origen, fecha, fecha_vencimiento, id_recurrencia)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE', 'RECURRENTE', ?, ?, ?)`,
      [recurrente.tipo, recurrente.categoria, recurrente.descripcion, recurrente.proveedor, recurrente.monto, recurrente.medio_pago, vencimiento, vencimiento, recurrente.id_recurrencia]
    );
  }
}

async function listarMovimientos(mes) {
  const mesNormalizado = normalizarMes(mes);
  await generarMovimientosRecurrentes(mesNormalizado);
  const movimientos = await all(
    `SELECT * FROM movimientos_caja
     WHERE substr(fecha, 1, 7) = ?
     ORDER BY COALESCE(fecha_vencimiento, fecha) ASC, id_movimiento DESC`,
    [mesNormalizado]
  );
  const ventas = await all(
    `SELECT COALESCE((SELECT SUM(total) FROM ventas WHERE substr(fecha, 1, 7) = ?), 0) AS total,
            COUNT(DISTINCT v.id_venta) AS cantidad,
            COALESCE(SUM(dv.cantidad * COALESCE(dv.costo_unitario, 0)), 0) AS costos_productos
     FROM ventas v
     LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
     WHERE substr(v.fecha, 1, 7) = ?`,
    [mesNormalizado, mesNormalizado]
  );
  const proveedores = await all(
    `SELECT DISTINCT proveedor FROM movimientos_caja
     WHERE proveedor IS NOT NULL AND trim(proveedor) <> ''
     ORDER BY proveedor COLLATE NOCASE`
  );
  const categorias = await all(
    `SELECT DISTINCT categoria FROM movimientos_caja
     WHERE trim(categoria) <> ''
     ORDER BY categoria COLLATE NOCASE`
  );

  const resumen = movimientos.reduce((acc, movimiento) => {
    const confirmado = movimiento.estado !== "PENDIENTE";
    if (movimiento.tipo === "INGRESO") {
      if (confirmado) acc.ingresosExternos += Number(movimiento.monto);
      else acc.ingresosPendientes += Number(movimiento.monto);
    } else if (confirmado) {
      acc.egresos += Number(movimiento.monto);
    } else {
      acc.egresosPendientes += Number(movimiento.monto);
    }
    return acc;
  }, { ingresosExternos: 0, ingresosPendientes: 0, egresos: 0, egresosPendientes: 0 });

  resumen.ventasPos = Number(ventas[0]?.total || 0);
  resumen.ticketsPos = Number(ventas[0]?.cantidad || 0);
  resumen.costosProductos = Number(ventas[0]?.costos_productos || 0);
  resumen.ingresosConfirmados = resumen.ventasPos + resumen.ingresosExternos;
  resumen.balance = resumen.ingresosConfirmados - resumen.costosProductos - resumen.egresos;
  const reporteMensual = await getReporteMensual(mesNormalizado);

  const ids = movimientos.map((movimiento) => movimiento.id_movimiento);
  const pagos = ids.length
    ? await all(`SELECT id_movimiento, medio_pago, monto FROM pagos_movimiento WHERE id_movimiento IN (${ids.map(() => "?").join(",")}) ORDER BY id_pago_movimiento`, ids)
    : [];
  const pagosPorMovimiento = pagos.reduce((mapa, pago) => {
    (mapa[pago.id_movimiento] ||= []).push(pago);
    return mapa;
  }, {});

  return {
    mes: mesNormalizado,
    resumen,
    reporteMensual,
    proveedores: proveedores.map((row) => row.proveedor),
    categorias: categorias.map((row) => row.categoria),
    movimientos: movimientos.map((movimiento) => ({
      ...movimiento,
      pagos: pagosPorMovimiento[movimiento.id_movimiento] || [],
      estado_visible: movimiento.estado === "PAGADO" && movimiento.tipo === "INGRESO" ? "INGRESADO" : movimiento.estado,
    })),
  };
}

async function getReporteMensual(mesSeleccionado) {
  const year = mesSeleccionado.slice(0, 4);
  const meses = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
  const mesAnterior = sumarMeses(mesSeleccionado, -1);
  const [ventas, movimientos, yearsRows] = await Promise.all([
    all(
      `SELECT substr(v.fecha, 1, 7) AS mes,
              COALESCE((SELECT SUM(v2.total) FROM ventas v2 WHERE substr(v2.fecha, 1, 7) = substr(v.fecha, 1, 7)), 0) AS ventas_pos,
              COALESCE(SUM(dv.cantidad * COALESCE(dv.costo_unitario, 0)), 0) AS costos_productos
       FROM ventas v
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       WHERE substr(v.fecha, 1, 7) <= ?
       GROUP BY substr(v.fecha, 1, 7)`,
      [`${year}-12`]
    ),
    all(
      `SELECT substr(fecha, 1, 7) AS mes, tipo, COALESCE(SUM(monto), 0) AS total
       FROM movimientos_caja
       WHERE estado = 'PAGADO' AND substr(fecha, 1, 7) <= ?
       GROUP BY substr(fecha, 1, 7), tipo`,
      [`${year}-12`]
    ),
    all(
      `SELECT DISTINCT substr(fecha, 1, 4) AS anio FROM (
         SELECT fecha FROM ventas WHERE substr(fecha, 1, 4) <= ?
         UNION
         SELECT fecha FROM movimientos_caja WHERE estado = 'PAGADO' AND substr(fecha, 1, 4) <= ?
       ) ORDER BY anio`,
      [year, year]
    ),
  ]);
  const anios = [...new Set([...yearsRows.map((row) => row.anio), year])];
  const todosLosMeses = anios.flatMap((anio) => Array.from({ length: 12 }, (_, index) => `${anio}-${String(index + 1).padStart(2, "0")}`));
  if (!todosLosMeses.includes(mesAnterior)) todosLosMeses.push(mesAnterior);
  const porMes = new Map(todosLosMeses.map((mes) => [mes, { mes, ventasPos: 0, costosProductos: 0, ingresosExternos: 0, egresos: 0, balance: 0 }]));
  ventas.forEach((venta) => {
    if (!porMes.has(venta.mes)) return;
    const item = porMes.get(venta.mes);
    item.ventasPos = Number(venta.ventas_pos);
    item.costosProductos = Number(venta.costos_productos);
  });
  movimientos.forEach((movimiento) => {
    const item = porMes.get(movimiento.mes);
    if (!item) return;
    if (movimiento.tipo === "INGRESO") item.ingresosExternos = Number(movimiento.total);
    else item.egresos = Number(movimiento.total);
  });
  todosLosMeses.forEach((mes) => {
    const item = porMes.get(mes);
    item.balance = item.ventasPos + item.ingresosExternos - item.costosProductos - item.egresos;
  });
  const seriesPorAnio = anios.map((anio) => ({
    anio,
    serie: Array.from({ length: 12 }, (_, index) => porMes.get(`${anio}-${String(index + 1).padStart(2, "0")}`)),
  }));
  const serie = seriesPorAnio.find((item) => item.anio === year).serie;
  const actual = porMes.get(mesSeleccionado);
  const anterior = porMes.get(mesAnterior);
  return {
    actual,
    anterior,
    variacionBalance: anterior.balance === 0 ? null : ((actual.balance - anterior.balance) / Math.abs(anterior.balance)) * 100,
    serie,
    seriesPorAnio,
  };
}

function normalizarPagos(pagos, montoTotal, medioPredeterminado) {
  const lista = Array.isArray(pagos) && pagos.length ? pagos : [{ medio_pago: medioPredeterminado, monto: montoTotal }];
  if (lista.length > 2) throw new Error("Se permiten hasta dos medios de pago");
  const normalizados = lista.map((pago) => ({
    medio_pago: String(pago.medio_pago || "").toLowerCase(),
    monto: Number(pago.monto),
  }));
  const suma = Number(normalizados.reduce((total, pago) => total + pago.monto, 0).toFixed(2));
  if (normalizados.some((pago) => !MEDIOS.has(pago.medio_pago) || !Number.isFinite(pago.monto) || pago.monto <= 0) || suma !== Number(montoTotal)) {
    throw new Error("Los pagos deben ser positivos y sumar el importe del movimiento");
  }
  return normalizados;
}

async function actualizarEstado(id, estado, pagos) {
  const nuevoEstado = String(estado || "").toUpperCase();
  if (!ESTADOS.has(nuevoEstado)) throw new Error("Estado de movimiento inválido");
  const movimiento = await get("SELECT monto, medio_pago FROM movimientos_caja WHERE id_movimiento = ?", [id]);
  if (!movimiento) throw new Error("Movimiento no encontrado");
  const pagosNormalizados = nuevoEstado === "PENDIENTE" ? [] : normalizarPagos(pagos, movimiento.monto, movimiento.medio_pago);
  const result = await run("UPDATE movimientos_caja SET estado = ?, medio_pago = ? WHERE id_movimiento = ?", [nuevoEstado === "PENDIENTE" ? "PENDIENTE" : "PAGADO", pagosNormalizados[0]?.medio_pago || movimiento.medio_pago, id]);
  if (!result.changes) throw new Error("Movimiento no encontrado");
  await run("DELETE FROM pagos_movimiento WHERE id_movimiento = ?", [id]);
  for (const pago of pagosNormalizados) {
    await run("INSERT INTO pagos_movimiento (id_movimiento, medio_pago, monto) VALUES (?, ?, ?)", [id, pago.medio_pago, pago.monto]);
  }
  return { id_movimiento: Number(id), estado: nuevoEstado };
}

async function getAlertasCaja() {
  const hoy = new Date().toISOString().slice(0, 10);
  const mesActual = hoy.slice(0, 7);
  const vencenHoy = await all(
    `SELECT id_movimiento, tipo, categoria, monto, fecha_vencimiento
     FROM movimientos_caja
     WHERE estado = 'PENDIENTE' AND fecha_vencimiento = ?`,
    [hoy]
  );
  const cierres = await all(
    `SELECT substr(m.fecha, 1, 7) AS mes, COUNT(*) AS pendientes
     FROM movimientos_caja m
     LEFT JOIN cierres_balance_mensual c ON c.mes = substr(m.fecha, 1, 7)
     WHERE m.estado = 'PENDIENTE' AND substr(m.fecha, 1, 7) < ? AND c.mes IS NULL
     GROUP BY substr(m.fecha, 1, 7)
     ORDER BY mes ASC`,
    [mesActual]
  );
  return [
    ...vencenHoy.map((movimiento) => ({
      id: `vencimiento-${movimiento.id_movimiento}`,
      tipo: "VENCIMIENTO",
      titulo: "Movimiento vence hoy",
      mensaje: `${movimiento.categoria}: $${Number(movimiento.monto).toFixed(2)} sigue pendiente.`,
      accion: { tipo: "IR_A_CAJA" },
    })),
    ...cierres.map((cierre) => ({
      id: `cierre-${cierre.mes}`,
      tipo: "CIERRE_MENSUAL",
      titulo: `Cerrar balance de ${cierre.mes}`,
      mensaje: `Hay ${cierre.pendientes} movimiento(s) pendiente(s). Revisalos o cerrá el balance para dejar el mes cerrado.`,
      accion: { tipo: "CERRAR_BALANCE", mes: cierre.mes },
    })),
  ];
}

async function cerrarBalanceMensual(mes) {
  if (!/^\d{4}-\d{2}$/.test(mes || "")) throw new Error("Mes inválido");
  await run("INSERT OR REPLACE INTO cierres_balance_mensual (mes, closed_at) VALUES (?, CURRENT_TIMESTAMP)", [mes]);
  return { mes };
}

function normalizarFechaCaja(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) throw new Error("Fecha invÃ¡lida");
  return fecha;
}

function normalizarImporteCaja(monto, mensaje) {
  const importe = Number(monto);
  if (!Number.isFinite(importe) || importe < 0) throw new Error(mensaje);
  return Number(importe.toFixed(2));
}

async function getCajaDiaria(fecha) {
  const fechaNormalizada = normalizarFechaCaja(fecha);
  const [cierre, ventas, movimientos] = await Promise.all([
    get("SELECT * FROM cierres_caja_diaria WHERE fecha = ?", [fechaNormalizada]),
    get(
      `SELECT COALESCE(SUM(monto), 0) AS total FROM (
        SELECT pv.monto FROM pagos_venta pv JOIN ventas v ON v.id_venta = pv.id_venta
        WHERE v.fecha = ? AND pv.medio_pago = 'efectivo'
        UNION ALL
        SELECT v.total AS monto FROM ventas v
        WHERE v.fecha = ? AND v.medio_pago = 'efectivo'
          AND NOT EXISTS (SELECT 1 FROM pagos_venta pv WHERE pv.id_venta = v.id_venta)
      )`,
      [fechaNormalizada, fechaNormalizada]
    ),
    all(
      `SELECT tipo, COALESCE(SUM(monto), 0) AS total FROM (
        SELECT m.tipo, pm.monto FROM movimientos_caja m
        JOIN pagos_movimiento pm ON pm.id_movimiento = m.id_movimiento
        WHERE m.fecha = ? AND m.estado = 'PAGADO' AND pm.medio_pago = 'efectivo'
        UNION ALL
        SELECT m.tipo, m.monto FROM movimientos_caja m
        WHERE m.fecha = ? AND m.estado = 'PAGADO' AND m.medio_pago = 'efectivo'
          AND NOT EXISTS (SELECT 1 FROM pagos_movimiento pm WHERE pm.id_movimiento = m.id_movimiento)
      ) GROUP BY tipo`,
      [fechaNormalizada, fechaNormalizada]
    ),
  ]);
  const porTipo = new Map(movimientos.map((movimiento) => [movimiento.tipo, Number(movimiento.total || 0)]));
  const montoApertura = Number(cierre?.monto_apertura || 0);
  const ventasEfectivo = Number(ventas?.total || 0);
  const ingresosEfectivo = porTipo.get("INGRESO") || 0;
  const egresosEfectivo = porTipo.get("EGRESO") || 0;
  const efectivoEsperado = montoApertura + ventasEfectivo + ingresosEfectivo - egresosEfectivo;
  const montoContado = cierre?.monto_contado === null || cierre?.monto_contado === undefined ? null : Number(cierre.monto_contado);
  return {
    fecha: fechaNormalizada,
    montoApertura,
    ventasEfectivo,
    ingresosEfectivo,
    egresosEfectivo,
    efectivoEsperado,
    montoContado,
    diferencia: montoContado === null ? null : Number((montoContado - efectivoEsperado).toFixed(2)),
    cerrada: Boolean(cierre?.closed_at),
    closedAt: cierre?.closed_at || null,
  };
}

async function guardarAperturaCaja(fecha, montoApertura) {
  const fechaNormalizada = normalizarFechaCaja(fecha);
  const importe = normalizarImporteCaja(montoApertura, "El saldo inicial debe ser cero o mayor");
  await run(
    `INSERT INTO cierres_caja_diaria (fecha, monto_apertura)
     VALUES (?, ?)
     ON CONFLICT(fecha) DO UPDATE SET monto_apertura = excluded.monto_apertura`,
    [fechaNormalizada, importe]
  );
  return getCajaDiaria(fechaNormalizada);
}

async function cerrarCajaDiaria(fecha, montoContado) {
  const fechaNormalizada = normalizarFechaCaja(fecha);
  const importe = normalizarImporteCaja(montoContado, "El efectivo contado debe ser cero o mayor");
  await run(
    `INSERT INTO cierres_caja_diaria (fecha, monto_apertura, monto_contado, closed_at)
     VALUES (?, 0, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(fecha) DO UPDATE SET monto_contado = excluded.monto_contado, closed_at = CURRENT_TIMESTAMP`,
    [fechaNormalizada, importe]
  );
  return getCajaDiaria(fechaNormalizada);
}

async function actualizarMontoRecurrente(idRecurrencia, monto) {
  const nuevoMonto = Number(monto);
  if (!Number.isFinite(nuevoMonto) || nuevoMonto <= 0) {
    throw new Error("El importe debe ser mayor a cero");
  }
  const importe = Number(nuevoMonto.toFixed(2));
  const actualizada = await run(
    "UPDATE movimientos_recurrentes SET monto = ? WHERE id_recurrencia = ?",
    [importe, idRecurrencia]
  );
  if (!actualizada.changes) throw new Error("Movimiento recurrente no encontrado");

  const mesActual = getMesActual();
  await run(
    `UPDATE movimientos_caja
     SET monto = ?
     WHERE id_recurrencia = ?
       AND estado = 'PENDIENTE'
       AND substr(fecha, 1, 7) >= ?`,
    [importe, idRecurrencia, mesActual]
  );
  return { id_recurrencia: Number(idRecurrencia), monto: importe };
}

module.exports = { listarMovimientos, crearMovimiento, actualizarEstado, getAlertasCaja, cerrarBalanceMensual, actualizarMontoRecurrente, getCajaDiaria, guardarAperturaCaja, cerrarCajaDiaria };
