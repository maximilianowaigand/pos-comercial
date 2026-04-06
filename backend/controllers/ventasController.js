const { registrarVenta, getTotales } = require("../data/ventasData");

// Registrar venta desde el frontend
exports.registrarVenta = async (req, res) => {
  const data = req.body; // items y metodo_pago vienen en req.body

  console.log("BODY RECIBIDO EN BACKEND:", data);

  if (!data.items || data.items.length === 0) {
    return res.json({ success: false, error: "No hay productos en la venta" });
  }

  try {
    const result = await registrarVenta(data); // <-- enviamos todo el objeto
    // result debería incluir ventaId y el total calculado por el trigger
    res.json({ success: true, ...result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
};
exports.totalDia = async (req, res) => {
  try {
    const totales = await getTotales(); // ⬅️ IMPORTANTE: await
    res.json(totales);
  } catch (error) {
    console.error("Error obteniendo total día:", error);
    res.status(500).json({ error: error.message });
  }
};



exports.totalMes = async (req, res) => {
  try {
    const totales = await getTotales(); // reutilizamos
    res.json({ totalMes: totales.totalMes });
  } catch (error) {
    console.error("Error obteniendo total mes:", error);
    res.status(500).json({ error: error.message });
  }
};