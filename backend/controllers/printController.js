const { emitirFacturaTusFacturas } = require("./facturaController");

exports.printTicket = async (req, res) => {
  try {
    console.log("📩 PRINT REQUEST:", req.body);

    const {
      items,
      metodoPago,
      datosCliente,
      total,
      id_venta,
      descuentoPorcentaje = 0,
      descuentoMonto = 0,
    } = req.body;

    if (!items || items.length === 0 || !metodoPago) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const mp = metodoPago.toLowerCase();

    const itemsNormalizados = items.map(i => ({
      producto_id: i.producto_id ?? i.id,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precio: i.precio
    }));

    let factura = null;

    if (
      (mp === "tarjeta" || mp === "transferencia") &&
      datosCliente?.nro_doc
    ) {
      factura = await emitirFacturaTusFacturas(
        itemsNormalizados,
        total,
        datosCliente,
        metodoPago
      );
    }

    let text = "";

    const center = (str) => {
      const width = 32;
      const left = Math.floor((width - str.length) / 2);
      return " ".repeat(left > 0 ? left : 0) + str;
    };

    
    text += center("PANADERIA TRES SABORES") + "\r\n";
    text += `TICKET Nro ${id_venta.toString().padStart(5, "0")}\r\n`;
    text += "------------------------------\r\n";
    text += `Fecha: ${new Date().toLocaleString()}\r\n`;
    text += `Pago: ${metodoPago.toUpperCase()}\r\n`;
    text += "------------------------------\r\n";

    itemsNormalizados.forEach(i => {
      text += `${i.nombre}\r\n`;
      text += `${i.cantidad} x $${i.precio}\r\n`;
    });

    text += "------------------------------\r\n";
    if (Number(descuentoPorcentaje) > 0) {
      text += `DESC. ${Number(descuentoPorcentaje).toFixed(2)}%: -$${Number(descuentoMonto).toFixed(2)}\r\n`;
    }
    text += `TOTAL: $${Number(total).toFixed(2)}\r\n`;

    if (factura?.cae) {
      text += "------------------------------\r\n";
      text += `FACTURA N°: ${factura.numero_comprobante}\r\n`;
      text += `CAE: ${factura.cae}\r\n`;
    }
    text += "------------------------------\r\n";

    text += center("GRACIAS POR SU COMPRA") + "\r\n";
    text += "\r\n";
    text += center("Seguinos en Instagram") + "\r\n";
    text += center("@tressaborespanaderia") + "\r\n";

    text += "\r\n\r\n\r\n";
    text += "\f";

    const fs = require("fs");
    const { exec } = require("child_process");
    const path = require("path");

    const ticketDir = process.env.APP_DATA_DIR
      ? path.resolve(process.env.APP_DATA_DIR)
      : path.join(__dirname, "..");
    const filePath = path.join(ticketDir, "ticket.txt");
    fs.writeFileSync(filePath, text);

    exec(`copy /b "${filePath}" \\\\localhost\\POS58_Printer`, err => {
      if (err) {
        return res.json({ ok: true, warning: "No se imprimió", factura });
      }

      res.json({ ok: true, factura });
    });

  } catch (err) {
    console.error("❌ Error printTicket:", err);
    res.status(500).json({ error: "Error interno" });
  }
};
