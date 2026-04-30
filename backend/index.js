const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const frontendDistPath = process.env.FRONTEND_DIST_PATH
  ? path.resolve(process.env.FRONTEND_DIST_PATH)
  : path.join(__dirname, "../frontend/dist");

app.use(cors());
app.use(express.json());

// ---- RUTAS API ----
const ventasRoutes = require("./routes/ventasRoutes");
const printRoutes = require("./routes/printRoutes");
const exportRoutes = require("./routes/exportRoutes");
const facturaRoutes = require("./routes/facturaRoutes");
const productosRoutes = require("./routes/productosRoutes");
const climaRoutes = require("./routes/clima");
const statsRoutes = require("./routes/statsRoute");

app.use("/api/ventas", ventasRoutes);
app.use("/api", printRoutes);
app.use("/api", exportRoutes);
app.use("/api", facturaRoutes);
app.use("/api", require("./routes/testFactura"));
app.use("/api/productos", productosRoutes); 
app.use("/api/clima", climaRoutes);
app.use("/api/stats", statsRoutes);

// ---- SERVIR FRONTEND (PRODUCCIÓN) ----
app.use(express.static(frontendDistPath));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

// ---- SERVER ----
const PORT = 3001; // 🔧 usamos uno solo
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);

});


