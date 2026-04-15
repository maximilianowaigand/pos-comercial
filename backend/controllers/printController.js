const { emitirFacturaTusFacturas } = require("./facturaController");
const ventasService = require("../services/ventasService"); // 👈 nuevo

exports.printTicket = async (req, res) => {
  try {
    const { items, total, metodoPago, datosCliente } = req.body;

    if (!items || !total || !metodoPago) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    console.log("📩 Datos recibidos en /print:", req.body);

    let factura = null;
    const mp = metodoPago.toLowerCase();

    // 🔥 FACTURACIÓN
    if ((mp === "tarjeta" || mp === "transferencia") && datosCliente?.nro_doc) {
      factura = await emitirFacturaTusFacturas(items, total, datosCliente, metodoPago);
    }

    // 🟢 GUARDAR EN SQLITE (NO JSON)
    const nuevaVenta = await ventasService.guardarVenta({
      items,
      total,
      metodo_pago: metodoPago,
      factura,
      cliente: datosCliente
    });

    // 🖨️ TICKET
    let text = "";
    text += "PANADERIA TRES SABORES\n";
    text += "------------------------------\n";
    text += `Ticket N°: ${nuevaVenta.ventaId}\n`;
    text += `Fecha: ${new Date().toLocaleString()}\n`;
    text += `Pago: ${metodoPago.toUpperCase()}\n`;
    text += "------------------------------\n";

    items.forEach(i => {
      text += `${i.nombre} x${i.cantidad} $${i.precio * i.cantidad}\n`;
    });

    text += "------------------------------\n";
    text += `TOTAL: $${total}\n`;

    if (factura?.cae) {
      text += "------------------------------\n";
      text += `FACTURA N°: ${factura.numero_comprobante}\n`;
      text += `CAE: ${factura.cae}\n`;
      text += `VTO CAE: ${factura.vencimiento_cae}\n`;
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
        console.error("❌ Error imprimiendo:", err);
        return res.json({
          ok: true,
          warning: "Venta guardada pero no se imprimió ticket",
          factura
        });
      }

      res.json({
        ok: true,
        ventaId: nuevaVenta.ventaId,
        facturado: factura !== null,
        factura
      });
    });

  } catch (err) {
    console.error("❌ Error en printTicket:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};