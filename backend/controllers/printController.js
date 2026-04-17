const { emitirFacturaTusFacturas } = require("./facturaController");
const ventasService = require("../services/ventasService");

exports.printTicket = async (req, res) => {
  try {
    const { items, metodoPago, datosCliente } = req.body;

    if (!items || items.length === 0 || !metodoPago) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    console.log("📩 PRINT REQUEST:", req.body);

    let factura = null;
    const mp = metodoPago.toLowerCase();

    // 1️⃣ Guardar venta (DB maneja precios + total)
    const nuevaVenta = await ventasService.registrarVenta({
      items,
      metodo_pago: metodoPago
    });

    // 2️⃣ Facturación (usa total real de DB)
    if (
      (mp === "tarjeta" || mp === "transferencia") &&
      datosCliente?.nro_doc
    ) {
      factura = await emitirFacturaTusFacturas(
        items,
        nuevaVenta.total,
        datosCliente,
        metodoPago
      );
    }

    // 3️⃣ Ticket
    let text = "";
    text += "PANADERIA TRES SABORES\n";
    text += "------------------------------\n";
    text += `Ticket N°: ${nuevaVenta.ventaId}\n`;
    text += `Fecha: ${new Date().toLocaleString()}\n`;
    text += `Pago: ${metodoPago.toUpperCase()}\n`;
    text += "------------------------------\n";

    items.forEach(i => {
      text += `Producto ${i.producto_id} x${i.cantidad}\n`;
    });

    text += "------------------------------\n";
    text += `TOTAL: $${nuevaVenta.total}\n`;

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
        return res.json({
          ok: true,
          warning: "Venta guardada pero no se imprimió",
          ventaId: nuevaVenta.ventaId,
          factura
        });
      }

      res.json({
        ok: true,
        ventaId: nuevaVenta.ventaId,
        total: nuevaVenta.total,
        factura
      });
    });

  } catch (err) {
    console.error("❌ Error printTicket:", err);
    res.status(500).json({ error: "Error interno" });
  }
};