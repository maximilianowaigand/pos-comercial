const { registrarVenta, getTotales, getTotalMes } = require("../services/ventasService");
const db = require('../db/index');

// Registrar venta
exports.registrarVenta = async (req, res) => {
  const data = req.body;
  console.log("BODY RECIBIDO EN BACKEND:", data);

  if (!data.items || data.items.length === 0) {
    return res.json({ success: false, error: "No hay productos en la venta" });
  }

  try {
    const result = await registrarVenta(data);
    res.json({ success: true, ...result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
};

// Totales del día
exports.totalDia = async (req, res) => {
  try {
    const totales = await getTotales();
    res.json({ totalDia: totales.totalDia, efectivo: totales.efectivo, transferencia: totales.transferencia, tarjeta: totales.tarjeta });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, error: "..." });;
  }
};

// Totales del mes
exports.totalMes = async (req, res) => {
  try {
    const totales = await getTotalMes();
    res.json({ totalMes: totales.totalMes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.getVentaById = (req, res) => {
  const db = require("../db");
  const { id } = req.params;


    db.all(
          `SELECT 
            p.nombre_producto AS nombre,
            d.cantidad,
            d.precio_unitario AS precio
          FROM detalle_venta d
          JOIN productos p ON p.id_producto = d.id_producto
          WHERE d.id_venta = ?`,
    [id],
    (err, items) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get(
        `SELECT * FROM ventas WHERE id_venta = ?`,
        [id],
        (err, venta) => {
          if (err) return res.status(500).json({ error: err.message });

          if (!venta) {
            return res.status(404).json({ error: "Venta no encontrada" });
          }

          res.json({
            ...venta,
            items,
          });
        }
      );
    }
  );
};

// Listar ventas
exports.listarVentas = (req, res) => {
  const sql = `
    SELECT 
      v.id_venta, 
      v.fecha, 
      v.hora, 
      v.medio_pago, 
      v.total, 
      v.estado,
      GROUP_CONCAT(p.nombre_producto || ' x' || dv.cantidad, ', ') AS productos
    FROM ventas v
    LEFT JOIN detalle_venta dv ON v.id_venta = dv.id_venta
    LEFT JOIN productos p ON dv.id_producto = p.id_producto
    GROUP BY v.id_venta
    ORDER BY v.fecha DESC, v.hora DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

