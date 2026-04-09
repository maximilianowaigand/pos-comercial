const fs = require("fs");
const path = require("path");

const ventasFile = path.join(__dirname, "../data/ventas.json");

function leerVentas() {
  if (!fs.existsSync(ventasFile)) return [];
  return JSON.parse(fs.readFileSync(ventasFile, "utf8"));
}

function guardarVentas(ventas) {
  fs.writeFileSync(ventasFile, JSON.stringify(ventas, null, 2));
}

module.exports = { leerVentas, guardarVentas };