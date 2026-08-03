const fs = require("fs");
const { execFile } = require("child_process");
const path = require("path");
const db = require("../db");
require("../config/env");

const TICKET_WIDTH = 32;
const DEFAULT_PRINTER_SHARE = "\\\\localhost\\POS58_Printer";

const PROFILE_ENV_PREFIX = {
  maximiliano: "ARCA",
  yohanna: "ARCA_SEGUNDO",
};

function getVentaFiscal(idVenta) {
  return new Promise((resolve) => {
    if (!idVenta) {
      resolve(null);
      return;
    }

    db.get(
      `SELECT
        facturacion_estado,
        factura_numero,
        factura_cae,
        factura_vencimiento,
        factura_respuesta,
        factura_error
       FROM ventas
       WHERE id_venta = ?`,
      [idVenta],
      (err, row) => {
        if (err) {
          console.error("Error leyendo datos fiscales:", err.message);
          resolve(null);
          return;
        }

        resolve(row || null);
      }
    );
  });
}

function formatFacturaNumero(puntoVenta, numero) {
  if (!numero) {
    return "";
  }

  return `${String(puntoVenta).padStart(5, "0")}-${String(numero).padStart(8, "0")}`;
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatLocalDateTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatArcaEmissionDate(value) {
  const text = String(value || "");

  if (text.length === 8) {
    return `${text.slice(6, 8)}/${text.slice(4, 6)}/${text.slice(0, 4)}`;
  }

  return new Date().toLocaleDateString("es-AR");
}

function toIsoArcaDate(value) {
  const text = String(value || "");

  if (text.length === 8) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }

  return new Date().toISOString().slice(0, 10);
}

function formatArcaDate(value) {
  const text = String(value || "");

  if (text.length !== 8) {
    return text;
  }

  return `${text.slice(6, 8)}/${text.slice(4, 6)}/${text.slice(0, 4)}`;
}

function parseJsonSafe(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function center(str) {
  const text = String(str || "");
  const left = Math.floor((TICKET_WIDTH - text.length) / 2);
  return " ".repeat(left > 0 ? left : 0) + text;
}

function separator() {
  return "-".repeat(30) + "\r\n";
}

function getProfileEnv(profileId, key, fallback = "") {
  const prefix = PROFILE_ENV_PREFIX[profileId] || "ARCA";
  return process.env[`${prefix}_${key}`] || process.env[`ARCA_${key}`] || fallback;
}

function getEmisorFiscal(facturaRespuesta = {}) {
  const profileId = facturaRespuesta.profile_id || "maximiliano";
  const razonSocial = getProfileEnv(profileId, "RAZON_SOCIAL", "");

  return {
    nombreFantasia: getProfileEnv(profileId, "NOMBRE_FANTASIA", "PANADERIA TRES SABORES"),
    razonSocial: razonSocial || "CONFIGURAR RAZON SOCIAL",
    cuit: facturaRespuesta.cuit || getProfileEnv(profileId, "CUIT", ""),
    domicilio: getProfileEnv(profileId, "DOMICILIO", ""),
    ingresosBrutos: getProfileEnv(profileId, "INGRESOS_BRUTOS", "Exento"),
    inicioActividades: getProfileEnv(profileId, "INICIO_ACTIVIDADES", ""),
    condicionIva: getProfileEnv(profileId, "CONDICION_IVA", "Responsable Monotributo"),
  };
}

function getDocLabel(docTipo) {
  const code = Number(docTipo);
  if (code === 80) return "CUIT/CUIL";
  if (code === 96) return "DNI";
  if (code === 99) return "S/D";
  return `Doc ${docTipo}`;
}

function getReceptorFiscal(facturaRespuesta = {}, datosCliente = {}) {
  const cliente = datosCliente || {};
  const docTipo = facturaRespuesta.doc_tipo ?? cliente.tipo_doc;
  const docNro = facturaRespuesta.doc_nro ?? cliente.nro_doc;

  return {
    razonSocial: cliente.razon_social || "Consumidor Final",
    condicionIva: cliente.condicion_iva || "Consumidor Final",
    domicilio: cliente.domicilio || "NR",
    docLabel: getDocLabel(docTipo),
    docNro: String(docNro || "0"),
  };
}

function getComprobanteLabel(tipo) {
  const code = Number(tipo);
  if (code === 11) return "FACTURA C";
  if (code === 12) return "NOTA DE DEBITO C";
  if (code === 13) return "NOTA DE CREDITO C";
  return `COMPROBANTE ${tipo}`;
}

function buildArcaQrUrl(facturaRespuesta = {}, datosFiscales = {}, total = 0) {
  const docTipo = Number(facturaRespuesta.doc_tipo || 99);
  const docNro = Number(facturaRespuesta.doc_nro || 0);
  const emisor = getEmisorFiscal(facturaRespuesta);
  const qrData = {
    ver: 1,
    fecha: toIsoArcaDate(facturaRespuesta.fecha),
    cuit: Number(facturaRespuesta.cuit || emisor.cuit),
    ptoVta: Number(facturaRespuesta.punto_venta),
    tipoCmp: Number(facturaRespuesta.tipo_comprobante || 11),
    nroCmp: Number(facturaRespuesta.numero_comprobante || datosFiscales.factura_numero),
    importe: Number(formatMoney(facturaRespuesta.total || total)),
    moneda: "PES",
    ctz: 1,
    tipoCodAut: "E",
    codAut: Number(datosFiscales.factura_cae),
  };

  if (docTipo === 99 || docNro > 0) {
    qrData.tipoDocRec = docTipo;
    qrData.nroDocRec = docNro;
  }

  if (!qrData.cuit || !qrData.ptoVta || !qrData.nroCmp || !qrData.codAut) {
    return "";
  }

  const payload = Buffer.from(JSON.stringify(qrData)).toString("base64");
  return `https://www.arca.gob.ar/fe/qr/?p=${payload}`;
}

function buildEscPosQr(data) {
  const qrData = Buffer.from(String(data || ""), "ascii");
  const storeLength = qrData.length + 3;
  const pL = storeLength % 256;
  const pH = Math.floor(storeLength / 256);

  return Buffer.concat([
    Buffer.from([0x1b, 0x61, 0x01]),
    Buffer.from([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04]),
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30]),
    Buffer.from([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]),
    qrData,
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),
    Buffer.from([0x1b, 0x61, 0x00]),
  ]);
}

function getPrinterShare() {
  return process.env.PRINTER_SHARE || process.env.THERMAL_PRINTER_SHARE || DEFAULT_PRINTER_SHARE;
}

function sendToPrinter(filePath) {
  return new Promise((resolve, reject) => {
    const printerShare = getPrinterShare();

    execFile(
      "cmd.exe",
      ["/d", "/s", "/c", "copy", "/b", filePath, printerShare],
      { windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          reject(
            new Error(
              `No se pudo imprimir en ${printerShare}. ${stderr || stdout || err.message}`
            )
          );
          return;
        }

        resolve({ printerShare, stdout });
      }
    );
  });
}

exports.printTicket = async (req, res) => {
  try {
    const {
      items,
      metodoPago,
      total,
      id_venta,
      facturacion,
      datosCliente = {},
      descuentoPorcentaje = 0,
      descuentoMonto = 0,
      pagos = []
    } = req.body;

    if (!items || items.length === 0 || !metodoPago) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const itemsNormalizados = items.map((i) => ({
      producto_id: i.producto_id ?? i.id,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precio: i.precio
    }));
    const datosFiscales = await getVentaFiscal(id_venta);

    const output = [];
    let text = "";
    const flushText = () => {
      if (!text) return;
      output.push(Buffer.from(text, "latin1"));
      text = "";
    };

    text += center("PANADERIA TRES SABORES") + "\r\n";
    text += separator();
    text += `Ticket interno: ${id_venta.toString().padStart(5, "0")}\r\n`;
    text += `Fecha: ${formatLocalDateTime()}\r\n`;
    const pagosTicket = Array.isArray(pagos) && pagos.length
      ? pagos
      : [{ medio_pago: metodoPago, monto: total }];
    text += "Pago:\r\n";
    pagosTicket.forEach((pago) => {
      text += `${String(pago.medio_pago || "").toUpperCase()}: $${formatMoney(pago.monto)}\r\n`;
    });
    text += separator();


    if (datosFiscales?.facturacion_estado === "FACTURADA") {
      const facturaRespuesta = parseJsonSafe(datosFiscales.factura_respuesta);
      const puntoVenta = facturaRespuesta.punto_venta || process.env.ARCA_PUNTO_VENTA || 3;
      const tipoComprobante = facturaRespuesta.tipo_comprobante || process.env.ARCA_COMPROBANTE_TIPO || 11;
      const emisor = getEmisorFiscal(facturaRespuesta);
      const receptor = getReceptorFiscal(facturaRespuesta, datosCliente);
      const totalFacturado = Number(facturaRespuesta.total || total);
      const qrUrl = buildArcaQrUrl(facturaRespuesta, datosFiscales, totalFacturado);

      text += center(getComprobanteLabel(tipoComprobante)) + "\r\n";
      text += center("ORIGINAL") + "\r\n";
      text += `Cod. ${tipoComprobante}\r\n`;
      text += `Nro: ${formatFacturaNumero(puntoVenta, datosFiscales.factura_numero)}\r\n`;
      text += `Emision: ${formatArcaEmissionDate(facturaRespuesta.fecha)}\r\n`;
      text += separator();
      text += `Razon Soc.:\r\n${emisor.razonSocial}\r\n`;
      text += `CUIT: ${emisor.cuit}\r\n`;
      text += `IVA: ${emisor.condicionIva}\r\n`;
      text += `Domicilio fiscal: ${emisor.domicilio || "S/D"}\r\n`;
      text += `IIBB: ${emisor.ingresosBrutos}\r\n`;
      if (emisor.inicioActividades) {
        text += `Inicio act.: ${emisor.inicioActividades}\r\n`;
      }
      text += separator();
      text += "A CONSUMIDOR FINAL\r\n";
      text += `Cliente: ${receptor.razonSocial}\r\n`;
      text += `${receptor.docLabel}: ${receptor.docNro}\r\n`;
      text += `IVA cliente: ${receptor.condicionIva}\r\n`;
      text += separator();
      text += `CAE: ${datosFiscales.factura_cae}\r\n`;
      text += `Vto CAE: ${formatArcaDate(datosFiscales.factura_vencimiento)}\r\n`;
      text += `TOTAL FACTURADO: $${formatMoney(totalFacturado)}\r\n`;
      if (qrUrl) {
        text += "QR ARCA:\r\n";
        flushText();
        output.push(buildEscPosQr(qrUrl));
        text += "\r\n";
      }
      text += separator();
    } else if (facturacion?.estado === "PENDIENTE" || facturacion?.queued || datosFiscales?.facturacion_estado === "PENDIENTE") {
      text += separator();
      text += "FACTURA ELECTRONICA PENDIENTE\r\n";
      text += "Se emitira automaticamente.\r\n";
    } else if (datosFiscales?.facturacion_estado === "ERROR") {
      text += separator();
      text += "FACTURA ELECTRONICA CON ERROR\r\n";
      text += "Revisar historial de ventas.\r\n";
    }

    itemsNormalizados.forEach((i) => {
      text += `${i.nombre}\r\n`;
      text += `${i.cantidad} x $${formatMoney(i.precio)} = $${formatMoney(Number(i.cantidad) * Number(i.precio))}\r\n`;
    });

    text += separator();
    if (Number(descuentoPorcentaje) > 0) {
      text += `DESC. ${Number(descuentoPorcentaje).toFixed(2)}%: -$${formatMoney(descuentoMonto)}\r\n`;
    }
    text += `TOTAL: $${formatMoney(total)}\r\n`;
    if (datosFiscales?.facturacion_estado === "FACTURADA") {
      text += "No discrimina IVA\r\n";
    }

    text += separator();
    text += center("GRACIAS POR SU COMPRA") + "\r\n";
    text += "\r\n";
    text += center("Seguinos en Instagram") + "\r\n";
    text += center("@tressaborespanaderia") + "\r\n";
    text += "\r\n\r\n\r\n";
    text += "\f";
    flushText();

    const ticketDir = process.env.APP_DATA_DIR
      ? path.resolve(process.env.APP_DATA_DIR)
      : path.join(__dirname, "..");
    const filePath = path.join(ticketDir, "ticket.txt");
    fs.writeFileSync(filePath, Buffer.concat(output));

    const printResult = await sendToPrinter(filePath);
    res.json({ ok: true, facturacion, printer: printResult.printerShare });
  } catch (err) {
    console.error("Error printTicket:", err);
    res.status(500).json({ error: err.message || "Error interno" });
  }
};
