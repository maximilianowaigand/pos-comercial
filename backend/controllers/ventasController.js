const { registrarVenta, getTotales, getTotalMes } = require("../services/ventasService");
const { reintentarFacturacionVenta } = require("../services/facturacionQueueService");
const db = require('../db/index');

// Registrar venta
exports.registrarVenta = async (req, res) => {
  const data = req.body;

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
    return res.status(400).json({ success: false, error: "..." });
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
            d.id_producto,
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

exports.reintentarFacturacion = async (req, res) => {
  try {
    const result = await reintentarFacturacionVenta(req.params.id);
    res.json({ success: true, facturacion: result });
  } catch (error) {
    console.error("Error reintentando facturacion:", error.message);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Listar ventas
  exports.listarVentas = (req, res) => {
    const { fecha } = req.query;

    let sql;
    let params = [];

    if (fecha) {
      sql = `
        SELECT
          v.id_venta,
          COALESCE(v.fecha, '') AS fecha,
          COALESCE(v.hora, '') AS hora,
          COALESCE(v.medio_pago, '') AS medio_pago,
          COALESCE(v.total, 0) AS total,
          COALESCE(v.descuento_porcentaje, 0) AS descuento_porcentaje,
          COALESCE(v.descuento_monto, 0) AS descuento_monto,
          v.facturacion_requerida,
          COALESCE(v.facturacion_estado, 'NO_REQUIERE') AS facturacion_estado,
          v.factura_cae,
          v.factura_vencimiento,
          v.factura_numero,
          v.factura_error,
          COALESCE(v.estado, '') AS estado
        FROM ventas v
        WHERE v.fecha = ?
        ORDER BY v.id_venta DESC
      `;

      params = [fecha];
    } else {
      sql = `
        SELECT
          v.id_venta,
          COALESCE(v.fecha, '') AS fecha,
          COALESCE(v.hora, '') AS hora,
          COALESCE(v.medio_pago, '') AS medio_pago,
          COALESCE(v.total, 0) AS total,
          COALESCE(v.descuento_porcentaje, 0) AS descuento_porcentaje,
          COALESCE(v.descuento_monto, 0) AS descuento_monto,
          v.facturacion_requerida,
          COALESCE(v.facturacion_estado, 'NO_REQUIERE') AS facturacion_estado,
          v.factura_cae,
          v.factura_vencimiento,
          v.factura_numero,
          v.factura_error,
          COALESCE(v.estado, '') AS estado
        FROM ventas v
        ORDER BY v.id_venta DESC
        LIMIT 100
      `;
    }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    console.log("Cantidad ventas:", rows.length);

    if (rows.length) {
      console.log("Venta más nueva:", rows[0].fecha);
      console.log("Venta más vieja:", rows[rows.length - 1].fecha);
     };
    if (!rows.length) {
      return res.json([]);
    }

    const ids = rows.map((row) => row.id_venta);
    const placeholders = ids.map(() => "?").join(", ");

    db.all(
      `SELECT
         dv.id_venta,
         COALESCE(p.nombre_producto, 'Producto') AS nombre,
         COALESCE(dv.cantidad, 0) AS cantidad
       FROM detalle_venta dv
       LEFT JOIN productos p ON dv.id_producto = p.id_producto
       WHERE dv.id_venta IN (${placeholders})
       ORDER BY dv.id_detalle ASC`,
      ids,
      (detalleErr, detalles) => {
        if (detalleErr) return res.status(500).json({ error: detalleErr.message });

        const productosPorVenta = detalles.reduce((acc, detalle) => {
          const key = detalle.id_venta;
          if (!acc[key]) acc[key] = [];
          acc[key].push(`${detalle.nombre} x${detalle.cantidad}`);
          return acc;
        }, {});

        res.json(
          rows.map((row) => ({
            ...row,
            productos: (productosPorVenta[row.id_venta] || []).join(", "),
          }))
        );
      }
    );
  });
};

