const fs = require("fs");
const path = require("path");

const ventasFile = path.join(__dirname, "../data/ventas.json");

exports.clientesDelDia = (req, res) => {
  if (!fs.existsSync(ventasFile)) {
    return res.json({ clientes: 0 });
  }

  const ventas = JSON.parse(fs.readFileSync(ventasFile, "utf8"));

  const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const clientesHoy = ventas.filter(v => v.fecha === hoy).length;

  res.json({ clientes: clientesHoy });
};
