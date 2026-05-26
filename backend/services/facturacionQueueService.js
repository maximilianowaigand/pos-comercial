const db = require("../db");
const { emitirFacturaArca } = require("./arcaService");

const METODOS_FACTURABLES = new Set([
  "transferencia",
  "transferencia bancaria",
  "tarjeta",
  "debito",
  "credito",
  "tarjeta de debito",
  "tarjeta de credito",
]);
const MAX_INTENTOS = 8;
const WORKER_INTERVAL_MS = Number(process.env.FACTURACION_WORKER_INTERVAL_MS) || 30000;

let workerStarted = false;
let processing = false;

function requiereFacturacion(metodoPago) {
  const normalizado = String(metodoPago || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return METODOS_FACTURABLES.has(normalizado);
}

function debeFacturarVenta(ventaData = {}) {
  if (ventaData.perfil_facturacion === "solo_ventas") {
    return false;
  }

  return requiereFacturacion(ventaData.metodo_pago) || ventaData.facturar_venta === true || ventaData.facturar_venta === "true";
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
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

function getDefaultCliente(cliente = {}) {
  const data = cliente || {};
  const nroDoc = String(data.nro_doc || "").replace(/\D/g, "");
  const consumidorFinal = !nroDoc;
  const tipoDoc = String(data.tipo_doc || "")
    .trim()
    .toUpperCase();
  const tipoDocId = tipoDoc === "CUIT" || tipoDoc === "CUIL" || tipoDoc === "80"
    ? 80
    : 96;

  return {
    razon_social: data.razon_social || "Consumidor Final",
    tipo_doc: consumidorFinal ? 99 : tipoDocId,
    nro_doc: consumidorFinal ? 0 : Number(nroDoc),
    domicilio: data.domicilio || "S/D",
    condicion_iva: data.condicion_iva || "Consumidor Final",
  };
}

function getProximoIntento(intentos) {
  const minutos = Math.min(120, Math.pow(2, Math.max(0, intentos - 1)));
  return new Date(Date.now() + minutos * 60000).toISOString();
}

async function encolarFacturacionVenta(idVenta, ventaData = {}) {
  console.log("[FACTURACION] Evaluando venta:", {
    idVenta,
    metodoPago: ventaData.metodo_pago,
    datosCliente: ventaData.datosCliente,
    requiereFacturacion: debeFacturarVenta(ventaData),
  });

  if (!debeFacturarVenta(ventaData)) {
    await run(
      `UPDATE ventas
       SET facturacion_requerida = 0,
           facturacion_estado = 'NO_REQUIERE',
           factura_error = NULL
       WHERE id_venta = ?`,
      [idVenta]
    );

    return { queued: false, estado: "NO_REQUIERE" };
  }

  const payload = {
    datosCliente: getDefaultCliente(ventaData.datosCliente),
    metodoPago: ventaData.metodo_pago,
    perfilFacturacion: ventaData.perfil_facturacion || "maximiliano",
  };

  console.log("[FACTURACION] Encolando payload:", {
    idVenta,
    payload,
  });

  await run(
    `INSERT OR IGNORE INTO facturacion_queue (
      id_venta,
      estado,
      payload_json
    ) VALUES (?, 'PENDIENTE', ?)`,
    [idVenta, JSON.stringify(payload)]
  );

  await run(
    `UPDATE facturacion_queue
     SET estado = CASE WHEN estado = 'FACTURADA' THEN estado ELSE 'PENDIENTE' END,
         payload_json = ?,
         proximo_intento_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id_venta = ?`,
    [JSON.stringify(payload), idVenta]
  );

  await run(
    `UPDATE ventas
     SET facturacion_requerida = 1,
         facturacion_estado = 'PENDIENTE',
         factura_error = NULL
     WHERE id_venta = ?`,
    [idVenta]
  );

  processNextFacturacionJob().catch((err) => {
    console.error("Error procesando cola de facturacion:", err.message);
  });

  return { queued: true, estado: "PENDIENTE" };
}

async function reintentarFacturacionVenta(idVenta) {
  const venta = await get(`SELECT * FROM ventas WHERE id_venta = ?`, [idVenta]);

  if (!venta) {
    throw new Error("Venta no encontrada");
  }

  if (!requiereFacturacion(venta.medio_pago)) {
    const row = await get(
      `SELECT facturacion_requerida FROM ventas WHERE id_venta = ?`,
      [idVenta]
    );

    if (!row?.facturacion_requerida) {
      throw new Error("La venta no requiere facturacion");
    }
  }

  await run(
    `INSERT OR IGNORE INTO facturacion_queue (
      id_venta,
      estado,
      intentos,
      proximo_intento_at
    ) VALUES (?, 'PENDIENTE', 0, CURRENT_TIMESTAMP)`,
    [idVenta]
  );

  await run(
    `UPDATE facturacion_queue
     SET estado = 'PENDIENTE',
         intentos = 0,
         proximo_intento_at = CURRENT_TIMESTAMP,
         ultimo_error = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id_venta = ?`,
    [idVenta]
  );

  await run(
    `UPDATE ventas
     SET facturacion_requerida = 1,
         facturacion_estado = 'PENDIENTE',
         factura_error = NULL
     WHERE id_venta = ?`,
    [idVenta]
  );

  processNextFacturacionJob().catch((err) => {
    console.error("Error procesando reintento de facturacion:", err.message);
  });

  return { queued: true, estado: "PENDIENTE" };
}

async function getVentaParaFacturar(idVenta) {
  const venta = await get(`SELECT * FROM ventas WHERE id_venta = ?`, [idVenta]);

  if (!venta) {
    throw new Error(`Venta ${idVenta} no encontrada`);
  }

  const items = await all(
    `SELECT
      p.id_producto AS id,
      p.nombre_producto AS nombre,
      dv.cantidad,
      dv.precio_unitario AS precio
     FROM detalle_venta dv
     JOIN productos p ON p.id_producto = dv.id_producto
     WHERE dv.id_venta = ?`,
    [idVenta]
  );

  if (!items.length) {
    throw new Error(`Venta ${idVenta} sin items`);
  }

  return { venta, items };
}

function getCampoFactura(respuesta, campos) {
  for (const campo of campos) {
    const value = campo.split(".").reduce((acc, key) => acc?.[key], respuesta);
    if (value) {
      return value;
    }
  }
  return null;
}

async function marcarJobFacturado(job, respuesta) {
  const cae = getCampoFactura(respuesta, ["cae", "comprobante.cae", "data.cae"]);
  const vencimiento = getCampoFactura(respuesta, [
    "vencimiento_cae",
    "cae_vencimiento",
    "comprobante.vencimiento_cae",
    "data.vencimiento_cae",
  ]);
  const numero = getCampoFactura(respuesta, [
    "numero_comprobante",
    "comprobante.numero_comprobante",
    "data.numero_comprobante",
  ]);
  const respuestaJson = JSON.stringify(respuesta);

  await run(
    `UPDATE facturacion_queue
     SET estado = 'FACTURADA',
         ultimo_error = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id_job = ?`,
    [job.id_job]
  );

  await run(
    `UPDATE ventas
     SET facturacion_estado = 'FACTURADA',
         factura_cae = ?,
         factura_vencimiento = ?,
         factura_numero = ?,
         factura_error = NULL,
         factura_respuesta = ?
     WHERE id_venta = ?`,
    [cae, vencimiento, numero, respuestaJson, job.id_venta]
  );
}

async function marcarJobConError(job, error) {
  const intentos = Number(job.intentos || 0) + 1;
  const agotado = intentos >= MAX_INTENTOS;
  const estado = agotado ? "ERROR" : "PENDIENTE";
  const mensaje = String(error.response?.data?.error || error.response?.data || error.message || error);

  await run(
    `UPDATE facturacion_queue
     SET estado = ?,
         intentos = ?,
         proximo_intento_at = ?,
         ultimo_error = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id_job = ?`,
    [estado, intentos, getProximoIntento(intentos), mensaje, job.id_job]
  );

  await run(
    `UPDATE ventas
     SET facturacion_estado = ?,
         factura_error = ?
     WHERE id_venta = ?`,
    [estado, mensaje, job.id_venta]
  );
}

async function processNextFacturacionJob() {
  if (processing) {
    return;
  }

  processing = true;

  try {
    const job = await get(
      `SELECT *
       FROM facturacion_queue
       WHERE estado = 'PENDIENTE'
         AND datetime(COALESCE(proximo_intento_at, CURRENT_TIMESTAMP)) <= datetime('now')
       ORDER BY id_job ASC
       LIMIT 1`
    );

    if (!job) {
      return;
    }

    await run(
      `UPDATE facturacion_queue
       SET estado = 'PROCESANDO',
           updated_at = CURRENT_TIMESTAMP
       WHERE id_job = ?`,
      [job.id_job]
    );

    await run(
      `UPDATE ventas
       SET facturacion_estado = 'PROCESANDO'
       WHERE id_venta = ?`,
      [job.id_venta]
    );

    try {
      const payload = JSON.parse(job.payload_json || "{}");
      const { venta, items } = await getVentaParaFacturar(job.id_venta);
      console.log("[FACTURACION] Procesando job:", {
        idJob: job.id_job,
        idVenta: job.id_venta,
        metodoPago: venta.medio_pago,
        total: venta.total,
        datosCliente: getDefaultCliente(payload.datosCliente),
        items,
      });

      console.log("[FACTURACION] Cliente enviado ARCA:", getDefaultCliente(payload.datosCliente));

      const respuesta = await emitirFacturaArca({
        items,
        total: venta.total,
        cliente: getDefaultCliente(payload.datosCliente),
        metodoPago: venta.medio_pago,
        profileId: payload.perfilFacturacion,
      });

      if (!respuesta) {
        throw new Error("El proveedor de facturacion no devolvio respuesta");
      }



      await marcarJobFacturado(job, respuesta);
    } catch (error) {
      await marcarJobConError(job, error);
    }
  } finally {
    processing = false;
  }
}

function startFacturacionWorker() {
  if (workerStarted) {
    return;
  }

  workerStarted = true;
  run(
    `UPDATE facturacion_queue
     SET estado = 'PENDIENTE',
         proximo_intento_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE estado = 'PROCESANDO'`
  ).catch((err) => {
    console.error("Error recuperando facturas en proceso:", err.message);
  });

  setInterval(() => {
    processNextFacturacionJob().catch((err) => {
      console.error("Error en worker de facturacion:", err.message);
    });
  }, WORKER_INTERVAL_MS);

  processNextFacturacionJob().catch((err) => {
    console.error("Error inicial en worker de facturacion:", err.message);
  });
}

module.exports = {
  requiereFacturacion,
  encolarFacturacionVenta,
  reintentarFacturacionVenta,
  processNextFacturacionJob,
  startFacturacionWorker,
};
