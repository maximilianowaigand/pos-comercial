const ExcelJS = require("exceljs");
const fs = require("fs");

exports.exportarExcel = async (req, res) => {
  try {
    // Cargar ventas
    const ventasData = JSON.parse(
      fs.readFileSync("./data/ventas.json", "utf8")
    );

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Ventas");

    // Encabezados
    sheet.columns = [
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "Total", key: "total", width: 15 },
    ];

    // Agregar filas
    ventasData.forEach(v => {
      sheet.addRow({
        fecha: v.fecha,
        total: v.total,
      });
    });

    // Crear archivo temporal
    const filePath = `ventas-${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    // Enviar archivo al frontend
    res.download(filePath, "ventas.xlsx", () => {
      fs.unlinkSync(filePath); // borrar archivo temporal
    });

  } catch (e) {
    console.error("Error al exportar Excel:", e);
    res.status(500).json({ success: false, error: "Error al generar Excel" });
  }
};
