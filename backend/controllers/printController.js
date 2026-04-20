const { emitirFacturaTusFacturas } = require("./facturaController");

exports.printTicket = async (req, res) => {
  try {
    console.log("📩 PRINT REQUEST:", req.body);

    const { items, metodoPago, datosCliente, total } = req.body;

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
    text += "PANADERIA TRES SABORES\n";
    text += "------------------------------\n";
    text += `Fecha: ${new Date().toLocaleString()}\n`;
    text += `Pago: ${metodoPago.toUpperCase()}\n`;
    text += "------------------------------\n";

    itemsNormalizados.forEach(i => {
      text += `${i.nombre}\n`;
      text += `${i.cantidad} x $${i.precio} = $${i.precio * i.cantidad}\n`;
    });

    text += "------------------------------\n";
    text += `TOTAL: $${total}\n`;

    if (factura?.cae) {
      text += "------------------------------\n";
      text += `FACTURA N°: ${factura.numero_comprobante}\n`;
      text += `CAE: ${factura.cae}\n`;
    }

    text += "------------------------------\n";
    text += "GRACIAS POR SU COMPRA\n";
    text += "\f";

    const fs = require("fs");
    const { exec } = require("child_process");
    const path = require("path");

    const filePath = path.join(__dirname, "../ticket.txt");
    fs.writeFileSync(filePath, text);

    exec(`notepad /p "${filePath}"`, err => {
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
