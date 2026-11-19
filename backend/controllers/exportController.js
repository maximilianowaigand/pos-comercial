const ExcelJS = require("exceljs");
const fs = require("fs");
const db = require("../db");

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function agregarHoja(workbook, nombre, columnas, filas, columnasMoneda = []) {
  const sheet = workbook.addWorksheet(nombre, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columnas;
  sheet.addRows(filas);
  sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + columnas.length)}1` };
  sheet.getRow(1).height = 24;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F5D50" } };
  sheet.getRow(1).alignment = { vertical: "middle" };

  columnasMoneda.forEach((key) => {
    sheet.getColumn(key).numFmt = '$#,##0.00';
  });
  return sheet;
}

exports.exportarExcel = async (req, res) => {
  try {
    const [ventas, detalleVentas, productos, pagosVentas, movimientos, pagosMovimientos, arqueos, clima] = await Promise.all([
      query(`SELECT v.id_venta, v.fecha, v.hora, v.medio_pago, v.total,
                    v.descuento_porcentaje, v.descuento_monto, v.estado,
                    COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) AS subtotal,
                    COALESCE(SUM(dv.cantidad * COALESCE(dv.costo_unitario, 0)), 0) AS costo_productos
             FROM ventas v
             LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
             GROUP BY v.id_venta
             ORDER BY v.fecha DESC, v.hora DESC`),
      query(`SELECT dv.id_detalle, dv.id_venta, v.fecha, v.hora, p.id_producto,
                    p.nombre_producto, p.categoria, dv.cantidad, dv.precio_unitario,
                    COALESCE(dv.costo_unitario, 0) AS costo_unitario,
                    dv.cantidad * dv.precio_unitario AS importe_venta,
                    dv.cantidad * COALESCE(dv.costo_unitario, 0) AS importe_costo,
                    dv.cantidad * (dv.precio_unitario - COALESCE(dv.costo_unitario, 0)) AS margen_bruto
             FROM detalle_venta dv
             JOIN ventas v ON v.id_venta = dv.id_venta
             JOIN productos p ON p.id_producto = dv.id_producto
             ORDER BY v.fecha DESC, v.hora DESC, dv.id_detalle DESC`),
      query(`SELECT id_producto, nombre_producto, categoria, precio_base, COALESCE(costo_base, 0) AS costo_base,
                    precio_base - COALESCE(costo_base, 0) AS margen_unitario
             FROM productos ORDER BY categoria, nombre_producto`),
      query(`SELECT pv.id_pago, pv.id_venta, v.fecha, v.hora, pv.medio_pago, pv.monto
             FROM pagos_venta pv JOIN ventas v ON v.id_venta = pv.id_venta
             ORDER BY v.fecha DESC, v.hora DESC, pv.id_pago DESC`),
      query(`SELECT id_movimiento, tipo, categoria, descripcion, proveedor, monto, medio_pago, estado,
                    origen, fecha, fecha_vencimiento, id_recurrencia, created_at
             FROM movimientos_caja ORDER BY fecha DESC, id_movimiento DESC`),
      query(`SELECT pm.id_pago_movimiento, pm.id_movimiento, m.fecha, m.tipo, m.categoria,
                    pm.medio_pago, pm.monto
             FROM pagos_movimiento pm JOIN movimientos_caja m ON m.id_movimiento = pm.id_movimiento
             ORDER BY m.fecha DESC, pm.id_pago_movimiento DESC`),
      query(`SELECT fecha, monto_apertura, monto_contado, closed_at FROM cierres_caja_diaria ORDER BY fecha DESC`),
      query(`SELECT fecha, temp_min, temp_max, lluvia_mm, prob_lluvia, created_at FROM clima_diario ORDER BY fecha DESC`),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "POS Panaderia";
    workbook.created = new Date();
    workbook.properties.title = "Modelo de datos para Power BI - POS Panaderia";

    const guia = workbook.addWorksheet("Guia Power BI");
    guia.columns = [{ width: 28 }, { width: 100 }];
    guia.addRows([
      ["Modelo de datos", "Importá cada hoja como una tabla independiente en Power BI. Las columnas id_venta, id_producto e id_movimiento sirven para crear relaciones."],
      ["Ventas", "Cabecera de cada operación. Incluye total, descuentos, costo de productos y margen bruto."],
      ["Detalle ventas", "Tabla de hechos a nivel de producto vendido; usala para productos, categorías, cantidades y rentabilidad."],
      ["Productos", "Dimensión de productos con precio, costo y margen unitario actual."],
      ["Pagos ventas", "Detalle de medios de pago de cada venta; una venta puede tener pagos mixtos."],
      ["Movimientos caja", "Ingresos y egresos manuales, con estado, proveedor, vencimiento y recurrencia."],
      ["Pagos movimientos", "Medios de pago efectivos de los movimientos confirmados."],
      ["Arqueos caja", "Apertura, efectivo contado y fecha de cierre para control de caja diaria."],
      ["Clima", "Temperatura y lluvia por día. Relacioná fecha con Ventas[fecha] para estudiar el impacto del clima."],
    ]);
    guia.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    guia.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F5D50" } };
    guia.getColumn(2).alignment = { wrapText: true, vertical: "top" };

    agregarHoja(workbook, "Ventas", [
      { header: "Id venta", key: "id_venta", width: 12 }, { header: "Fecha", key: "fecha", width: 14 }, { header: "Hora", key: "hora", width: 12 },
      { header: "Medio de pago", key: "medio_pago", width: 18 }, { header: "Subtotal", key: "subtotal", width: 15 }, { header: "Descuento %", key: "descuento_porcentaje", width: 14 },
      { header: "Descuento monto", key: "descuento_monto", width: 17 }, { header: "Total vendido", key: "total", width: 16 }, { header: "Costo productos", key: "costo_productos", width: 17 },
      { header: "Margen bruto", key: "margen_bruto", width: 16 }, { header: "Estado", key: "estado", width: 13 },
    ], ventas.map((venta) => ({ ...venta, margen_bruto: Number(venta.total) - Number(venta.costo_productos) })), ["subtotal", "descuento_monto", "total", "costo_productos", "margen_bruto"]);

    agregarHoja(workbook, "Detalle ventas", [
      { header: "Id detalle", key: "id_detalle", width: 12 }, { header: "Id venta", key: "id_venta", width: 11 }, { header: "Fecha", key: "fecha", width: 14 }, { header: "Hora", key: "hora", width: 12 },
      { header: "Id producto", key: "id_producto", width: 13 }, { header: "Producto", key: "nombre_producto", width: 28 }, { header: "Categoría", key: "categoria", width: 20 },
      { header: "Cantidad", key: "cantidad", width: 11 }, { header: "Precio unitario", key: "precio_unitario", width: 16 }, { header: "Costo unitario", key: "costo_unitario", width: 16 },
      { header: "Importe venta", key: "importe_venta", width: 16 }, { header: "Importe costo", key: "importe_costo", width: 16 }, { header: "Margen bruto", key: "margen_bruto", width: 16 },
    ], detalleVentas, ["precio_unitario", "costo_unitario", "importe_venta", "importe_costo", "margen_bruto"]);

    agregarHoja(workbook, "Productos", [
      { header: "Id producto", key: "id_producto", width: 13 }, { header: "Producto", key: "nombre_producto", width: 28 }, { header: "Categoría", key: "categoria", width: 20 },
      { header: "Precio base", key: "precio_base", width: 15 }, { header: "Costo base", key: "costo_base", width: 15 }, { header: "Margen unitario", key: "margen_unitario", width: 17 },
    ], productos, ["precio_base", "costo_base", "margen_unitario"]);

    agregarHoja(workbook, "Pagos ventas", [
      { header: "Id pago", key: "id_pago", width: 11 }, { header: "Id venta", key: "id_venta", width: 11 }, { header: "Fecha", key: "fecha", width: 14 },
      { header: "Hora", key: "hora", width: 12 }, { header: "Medio de pago", key: "medio_pago", width: 18 }, { header: "Monto", key: "monto", width: 15 },
    ], pagosVentas, ["monto"]);

    agregarHoja(workbook, "Movimientos caja", [
      { header: "Id movimiento", key: "id_movimiento", width: 15 }, { header: "Tipo", key: "tipo", width: 12 }, { header: "Categoría", key: "categoria", width: 22 },
      { header: "Descripción", key: "descripcion", width: 32 }, { header: "Proveedor", key: "proveedor", width: 25 }, { header: "Monto", key: "monto", width: 15 },
      { header: "Medio de pago", key: "medio_pago", width: 18 }, { header: "Estado", key: "estado", width: 13 }, { header: "Origen", key: "origen", width: 15 },
      { header: "Fecha", key: "fecha", width: 14 }, { header: "Vencimiento", key: "fecha_vencimiento", width: 15 }, { header: "Id recurrencia", key: "id_recurrencia", width: 14 }, { header: "Creado", key: "created_at", width: 22 },
    ], movimientos, ["monto"]);

    agregarHoja(workbook, "Pagos movimientos", [
      { header: "Id pago", key: "id_pago_movimiento", width: 11 }, { header: "Id movimiento", key: "id_movimiento", width: 15 }, { header: "Fecha", key: "fecha", width: 14 },
      { header: "Tipo", key: "tipo", width: 12 }, { header: "Categoría", key: "categoria", width: 22 }, { header: "Medio de pago", key: "medio_pago", width: 18 }, { header: "Monto", key: "monto", width: 15 },
    ], pagosMovimientos, ["monto"]);

    agregarHoja(workbook, "Arqueos caja", [
      { header: "Fecha", key: "fecha", width: 14 }, { header: "Saldo inicial", key: "monto_apertura", width: 16 }, { header: "Efectivo contado", key: "monto_contado", width: 18 }, { header: "Fecha de cierre", key: "closed_at", width: 22 },
    ], arqueos, ["monto_apertura", "monto_contado"]);

    agregarHoja(workbook, "Clima", [
      { header: "Fecha", key: "fecha", width: 14 }, { header: "Temperatura mínima", key: "temp_min", width: 19 }, { header: "Temperatura máxima", key: "temp_max", width: 19 },
      { header: "Lluvia (mm)", key: "lluvia_mm", width: 15 }, { header: "Probabilidad lluvia (%)", key: "prob_lluvia", width: 23 }, { header: "Registrado", key: "created_at", width: 22 },
    ], clima);

    const filePath = `modelo-power-bi-${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);
    res.download(filePath, "modelo-power-bi-panaderia.xlsx", () => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error("Error al exportar Excel:", error);
    res.status(500).json({ success: false, error: "Error al generar el modelo para Power BI" });
  }
};
