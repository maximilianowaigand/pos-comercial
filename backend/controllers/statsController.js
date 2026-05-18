const { getDashboardStats } = require("../services/ventasService");

exports.dashboard = async (req, res) => {
  try {
    const stats = await getDashboardStats(req.query);
    res.json(stats);
  } catch (error) {
    console.error("Error obteniendo dashboard:", error);
    res.status(500).json({ error: "No se pudieron obtener las metricas" });
  }
};
