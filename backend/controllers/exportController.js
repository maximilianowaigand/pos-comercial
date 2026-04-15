const ExcelJS = require("exceljs");
const db = require("../db"); // 👈 SQLite

exports.exportarExcel = async (req, res) => {
  try {
    // 🟢 leer desde SQLite
    const ventasData = await db.all(
      `SELECT fecha, total, metodo_pago FROM ventas ORDER BY id DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Ventas");

    sheet.columns = [
      { header: "Fecha", key: "fecha", width: 25 },
      { header: "Total", key: "total", width: 15 },
      { header: "Método de pago", key: "metodo_pago", width: 20 },
    ];

    ventasData.forEach(v => {
      sheet.addRow({
        fecha: v.fecha,
        total: v.total,
        metodo_pago: v.metodo_pago
      });
    });

    const filePath = `ventas-${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, "ventas.xlsx", () => {
      const fs = require("fs");
      fs.unlinkSync(filePath);
    });

  } catch (e) {
    console.error("Error al exportar Excel:", e);
    res.status(500).json({
      success: false,
      error: "Error al generar Excel"
    });
  }
};