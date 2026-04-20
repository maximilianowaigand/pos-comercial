const ExcelJS = require("exceljs");
const fs = require("fs");
const db = require("../db");

exports.exportarExcel = async (req, res) => {
  try {
    const ventasData = await new Promise((resolve, reject) => {
      db.all(
        `SELECT fecha, total, medio_pago
         FROM ventas
         ORDER BY id_venta DESC`,
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Ventas");

    sheet.columns = [
      { header: "Fecha", key: "fecha", width: 25 },
      { header: "Total", key: "total", width: 15 },
      { header: "Metodo de pago", key: "metodo_pago", width: 20 },
    ];

    ventasData.forEach((venta) => {
      sheet.addRow({
        fecha: venta.fecha,
        total: venta.total,
        metodo_pago: venta.medio_pago,
      });
    });

    const filePath = `ventas-${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, "ventas.xlsx", () => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (e) {
    console.error("Error al exportar Excel:", e);
    res.status(500).json({
      success: false,
      error: "Error al generar Excel",
    });
  }
};
