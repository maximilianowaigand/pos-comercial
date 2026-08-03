const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

// La base se crea fuera del proyecto para que las pruebas nunca usen datos reales.
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pos-panaderia-test-"));
process.env.APP_DATA_DIR = testDataDir;
process.env.SKIP_LEGACY_DATA_BOOTSTRAP = "true";

const db = require("../db");
const { crearProducto } = require("../services/productosService");
const { registrarVenta } = require("../services/ventasService");
const { crearMovimiento, listarMovimientos, actualizarEstado, getAlertasCaja, cerrarBalanceMensual, actualizarMontoRecurrente, getCajaDiaria, guardarAperturaCaja, cerrarCajaDiaria } = require("../services/movimientosService");

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
  });
}

test.after(() => new Promise((resolve) => {
  db.close(() => {
    fs.rmSync(testDataDir, { recursive: true, force: true });
    resolve();
  });
}));

test("guarda una venta en efectivo y calcula el descuento", async () => {
  const producto = await crearProducto({
    nombre: "Medialuna",
    precio: 100,
    costo: 40,
    categoria: "Panificados",
  });

  const resultado = await registrarVenta({
    items: [{ producto_id: producto.id, cantidad: 2, precio_unitario: 100 }],
    pagos: [{ medio_pago: "efectivo", monto: 180 }],
    descuento_porcentaje: 10,
    perfil_facturacion: "solo_ventas",
  });

  assert.equal(resultado.subtotal, 200);
  assert.equal(resultado.total, 180);
  assert.equal(resultado.facturacion.estado, "NO_REQUIERE");

  const venta = await get("SELECT total, descuento_monto, medio_pago FROM ventas WHERE id_venta = ?", [resultado.id_venta]);
  const pago = await get("SELECT monto, medio_pago FROM pagos_venta WHERE id_venta = ?", [resultado.id_venta]);
  const detalle = await get("SELECT cantidad, precio_unitario, costo_unitario FROM detalle_venta WHERE id_venta = ?", [resultado.id_venta]);

  assert.deepEqual(venta, { total: 180, descuento_monto: 20, medio_pago: "efectivo" });
  assert.deepEqual(pago, { monto: 180, medio_pago: "efectivo" });
  assert.deepEqual(detalle, { cantidad: 2, precio_unitario: 100, costo_unitario: 40 });
});

test("rechaza una venta si los pagos no suman el total", async () => {
  const producto = await crearProducto({ nombre: "Café", precio: 500, categoria: "Bebidas" });
  const antes = await get("SELECT COUNT(*) AS cantidad FROM ventas");

  await assert.rejects(
    registrarVenta({
      items: [{ producto_id: producto.id, cantidad: 1, precio_unitario: 500 }],
      pagos: [{ medio_pago: "efectivo", monto: 450 }],
      perfil_facturacion: "solo_ventas",
    }),
    /sumar el total/
  );

  const despues = await get("SELECT COUNT(*) AS cantidad FROM ventas");
  assert.equal(despues.cantidad, antes.cantidad);
});

test("admite pagos mixtos y conserva cada importe", async () => {
  const producto = await crearProducto({ nombre: "Torta", precio: 1000, categoria: "Pastelería" });
  const resultado = await registrarVenta({
    items: [{ producto_id: producto.id, cantidad: 1, precio_unitario: 1000 }],
    pagos: [
      { medio_pago: "efectivo", monto: 400 },
      { medio_pago: "tarjeta", monto: 600 },
    ],
    perfil_facturacion: "solo_ventas",
  });

  const venta = await get("SELECT medio_pago, total FROM ventas WHERE id_venta = ?", [resultado.id_venta]);
  const pagos = await new Promise((resolve, reject) => {
    db.all("SELECT medio_pago, monto FROM pagos_venta WHERE id_venta = ? ORDER BY id_pago", [resultado.id_venta], (error, rows) => error ? reject(error) : resolve(rows));
  });

  assert.deepEqual(venta, { medio_pago: "mixto", total: 1000 });
  assert.deepEqual(pagos, [
    { medio_pago: "efectivo", monto: 400 },
    { medio_pago: "tarjeta", monto: 600 },
  ]);
});

test("valida los movimientos manuales de caja", async () => {
  await assert.rejects(
    crearMovimiento({ tipo: "EGRESO", categoria: "Luz", monto: 0, medio_pago: "efectivo" }),
    /Datos de movimiento/
  );

  const resultado = await crearMovimiento({
    tipo: "EGRESO",
    categoria: "Luz",
    monto: 1500.5,
    medio_pago: "transferencia",
    estado: "PAGADO",
    fecha: "2026-07-30",
  });
  const movimiento = await get("SELECT tipo, categoria, monto, medio_pago, estado FROM movimientos_caja WHERE id_movimiento = ?", [resultado.id_movimiento]);

  assert.deepEqual(movimiento, {
    tipo: "EGRESO",
    categoria: "Luz",
    monto: 1500.5,
    medio_pago: "transferencia",
    estado: "PAGADO",
  });
});

test("crea movimientos recurrentes pendientes para el mes siguiente", async () => {
  const creado = await crearMovimiento({
    tipo: "EGRESO",
    categoria: "Insumos",
    monto: 25000,
    medio_pago: "transferencia",
    estado: "PENDIENTE",
    fecha: "2026-07-30",
    fecha_vencimiento: "2026-07-30",
    proveedor: "PedidosYa Argentina",
    recurrente: true,
  });

  assert.ok(creado.id_recurrencia);
  const agosto = await listarMovimientos("2026-08");
  const recurrente = agosto.movimientos.find((movimiento) => movimiento.id_recurrencia === creado.id_recurrencia);

  assert.equal(recurrente.fecha_vencimiento, "2026-08-30");
  assert.equal(recurrente.proveedor, "PedidosYa Argentina");
  assert.equal(recurrente.estado_visible, "PENDIENTE");

  await actualizarMontoRecurrente(creado.id_recurrencia, 26000);
  const agostoActualizado = await listarMovimientos("2026-08");
  assert.equal(agostoActualizado.movimientos.find((movimiento) => movimiento.id_recurrencia === creado.id_recurrencia).monto, 26000);

  await actualizarEstado(recurrente.id_movimiento, "PAGADO");
  const actualizado = await get("SELECT estado FROM movimientos_caja WHERE id_movimiento = ?", [recurrente.id_movimiento]);
  assert.equal(actualizado.estado, "PAGADO");
});

test("permite confirmar un gasto con dos medios de pago", async () => {
  const creado = await crearMovimiento({
    tipo: "EGRESO", categoria: "Proveedor", monto: 1000, medio_pago: "efectivo", estado: "PENDIENTE", fecha: "2026-07-30",
  });

  await actualizarEstado(creado.id_movimiento, "PAGADO", [
    { medio_pago: "efectivo", monto: 300 },
    { medio_pago: "transferencia", monto: 700 },
  ]);

  const pagos = await new Promise((resolve, reject) => {
    db.all("SELECT medio_pago, monto FROM pagos_movimiento WHERE id_movimiento = ? ORDER BY id_pago_movimiento", [creado.id_movimiento], (error, rows) => error ? reject(error) : resolve(rows));
  });
  assert.deepEqual(pagos, [{ medio_pago: "efectivo", monto: 300 }, { medio_pago: "transferencia", monto: 700 }]);
});

test("calcula el arqueo diario de efectivo y guarda su cierre", async () => {
  const fecha = "2026-07-15";
  await crearMovimiento({
    tipo: "EGRESO", categoria: "Compra en efectivo", monto: 30, medio_pago: "efectivo", estado: "PAGADO", fecha,
  });
  await crearMovimiento({
    tipo: "INGRESO", categoria: "Ingreso en efectivo", monto: 20, medio_pago: "efectivo", estado: "PAGADO", fecha,
  });

  await guardarAperturaCaja(fecha, 100);
  const previo = await getCajaDiaria(fecha);
  assert.equal(previo.efectivoEsperado, 90);
  assert.equal(previo.montoContado, null);

  const cerrado = await cerrarCajaDiaria(fecha, 85);
  assert.equal(cerrado.montoContado, 85);
  assert.equal(cerrado.diferencia, -5);
  assert.equal(cerrado.cerrada, true);
});

test("avisa y permite cerrar un mes anterior con pendientes", async () => {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const mesAnterior = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await crearMovimiento({
    tipo: "EGRESO", categoria: "Servicio pendiente", monto: 500, medio_pago: "transferencia", estado: "PENDIENTE", fecha: `${mesAnterior}-10`, fecha_vencimiento: `${mesAnterior}-10`,
  });

  const alertasAntes = await getAlertasCaja();
  assert.ok(alertasAntes.some((alerta) => alerta.id === `cierre-${mesAnterior}`));

  await cerrarBalanceMensual(mesAnterior);
  const alertasDespues = await getAlertasCaja();
  assert.ok(!alertasDespues.some((alerta) => alerta.id === `cierre-${mesAnterior}`));
});
