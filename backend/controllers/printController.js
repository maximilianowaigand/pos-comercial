
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

// 👇 IMPORTACIÓN CORRECTA
const { emitirFacturaTusFacturas } = require("./facturaController");

const ventasFile = path.join(__dirname, "../data/ventas.json");

// Leer ventas
function leerVentas() {
  if (!fs.existsSync(ventasFile)) return [];
  return JSON.parse(fs.readFileSync(ventasFile, "utf8"));
}

// Guardar ventas
function guardarVentas(ventas) {
  fs.writeFileSync(ventasFile, JSON.stringify(ventas, null, 2));
}

exports.printTicket = async (req, res) => {
  try {
    const { items, total, metodoPago, datosCliente } = req.body;

    if (!items || !total || !metodoPago) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    console.log("📩 Datos recibidos en /print:", req.body);

    let factura = null;
    const mp = metodoPago.toLowerCase();

    // 🔥 FACTURAR SÓLO TARJETA O TRANSFERENCIA
    if ((mp === "tarjeta" || mp === "transferencia") && datosCliente?.nro_doc) {
      factura = await emitirFacturaTusFacturas(items, total, datosCliente, metodoPago);
    }

    // Guardar venta
    const ventas = leerVentas();
    const nuevaVenta = {
      id: ventas.length + 1,
      fecha: new Date().toISOString().slice(0, 10),
      items,
      total,
      metodoPago,
      factura,
      cliente: datosCliente
    };

    ventas.push(nuevaVenta);
    guardarVentas(ventas);

    // IMPRIMIR TICKET
    let text = "";
    text += "PANADERIA TRES SABORES\n";
    text += "------------------------------\n";
    text += `Ticket N°: ${nuevaVenta.id}\n`;
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

    const filePath = path.join(__dirname, "../ticket.txt");
    fs.writeFileSync(filePath, text);

    exec(`notepad /p "${filePath}"`, err => {
      if (err) {
        console.error("❌ Error imprimiendo:", err);
        return res.json({
          ok: true,
          warning: "Imprimió venta pero no imprimió ticket",
          factura
        });
      }

      res.json({
        ok: true,
        facturado: factura !== null,
        factura
      });
    });

  } catch (err) {
    console.error("❌ Error en printTicket:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

