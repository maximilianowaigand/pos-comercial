const { emitirFacturaTusFacturas } = require("./facturaController");
const {
  ThermalPrinter,
  PrinterTypes,
  BreakLine,
} = require("node-thermal-printer");

const TICKET_WIDTH = 30;
const PRINTER_INTERFACE = "USB001";

function separator() {
  return "-".repeat(TICKET_WIDTH);
}

function center(text) {
  const value = String(text).slice(0, TICKET_WIDTH);
  const left = Math.max(0, Math.floor((TICKET_WIDTH - value.length) / 2));
  return `${" ".repeat(left)}${value}`;
}

function wrapLine(text, width = TICKET_WIDTH) {
  const value = String(text ?? "").trim();
  if (!value) return [""];

  const words = value.split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    if (word.length > width) {
      if (current) {
        lines.push(current);
        current = "";
      }

      for (let i = 0; i < word.length; i += width) {
        lines.push(word.slice(i, i + width));
      }
      return;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function formatItemLine(cantidad, precio, subtotal) {
  const base = `${cantidad} x $${precio}`;
  const total = `$${subtotal}`;
  const spaces = Math.max(1, TICKET_WIDTH - base.length - total.length);
  return `${base}${" ".repeat(spaces)}${total}`.slice(0, TICKET_WIDTH);
}

function buildTicketLines({ items, metodoPago, total, factura }) {
  const lines = [];
  const now = new Date();

  lines.push(center("PANADERIA TRES SABORES"));
  lines.push(separator());
  lines.push(`Fecha: ${now.toLocaleDateString()}`);
  lines.push(`Hora: ${now.toLocaleTimeString()}`);
  lines.push(`Pago: ${metodoPago.toUpperCase()}`);
  lines.push(separator());

  items.forEach((item) => {
    wrapLine(item.nombre).forEach((line) => lines.push(line));
    lines.push(
      formatItemLine(
        item.cantidad,
        item.precio ?? 0,
        (item.precio ?? 0) * item.cantidad
      )
    );
    lines.push(separator());
  });

  lines.push(`TOTAL: $${total}`);

  if (factura?.cae) {
    lines.push(separator());
    lines.push(`FACTURA N: ${factura.numero_comprobante}`);
    lines.push(`CAE: ${factura.cae}`);
  }

  lines.push(separator());
  lines.push(center("GRACIAS POR SU COMPRA"));

  return lines;
}

async function printDirect(lines) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: PRINTER_INTERFACE,
    width: TICKET_WIDTH,
    breakLine: BreakLine.WORD,
    removeSpecialCharacters: false,
    lineCharacter: "-",
    options: {
      timeout: 1000,
    },
  });

  printer.clear();
  printer.alignLeft();

  lines.forEach((line) => printer.println(line));

  printer.newLine();
  printer.cut();

  await printer.execute();
}

exports.printTicket = async (req, res) => {
  try {
    console.log("PRINT REQUEST:", req.body);

    const { items, metodoPago, datosCliente, total } = req.body;

    if (!items || items.length === 0 || !metodoPago) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const mp = metodoPago.toLowerCase();

    const itemsNormalizados = items.map((i) => ({
      producto_id: i.producto_id ?? i.id,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precio: i.precio,
    }));

    let factura = null;

    if ((mp === "tarjeta" || mp === "transferencia") && datosCliente?.nro_doc) {
      factura = await emitirFacturaTusFacturas(
        itemsNormalizados,
        total,
        datosCliente,
        metodoPago
      );
    }

    const lines = buildTicketLines({
      items: itemsNormalizados,
      metodoPago,
      total,
      factura,
    });

    const fs = require("fs");
    const { exec } = require("child_process");
    const path = require("path");
    const filePath = path.join(__dirname, "../ticket.txt");
    fs.writeFileSync(filePath, `${lines.join("\r\n")}\r\n\f`, "utf8");

    try {
      await printDirect(lines);
      return res.json({ ok: true, factura });
    } catch (directError) {
      console.error("Direct print failed, fallback to notepad:", directError);

      exec(`notepad /p "${filePath}"`, (err) => {
        if (err) {
          return res.json({
            ok: false,
            warning: "No se imprimio",
            factura,
          });
        }

        res.json({
          ok: true,
          warning: "Se uso impresion de respaldo",
          factura,
        });
      });
    }
  } catch (err) {
    console.error("Error printTicket:", err);
    res.status(500).json({ error: "Error interno" });
  }
};
