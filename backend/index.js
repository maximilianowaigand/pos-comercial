const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ---- RUTAS API ----
const ventasRoutes = require("./routes/ventasRoutes");
const printRoutes = require("./routes/printRoutes");
const exportRoutes = require("./routes/exportRoutes");
const facturaRoutes = require("./routes/facturaRoutes");
const productosRoutes = require("./routes/productosRoutes");
const climaRoutes = require("./routes/clima");

app.use("/api/ventas", ventasRoutes);
app.use("/api", printRoutes);
app.use("/api", exportRoutes);
app.use("/api", facturaRoutes);
app.use("/api", require("./routes/testFactura"));
app.use("/api/productos", productosRoutes); 
app.use("/api/clima", climaRoutes);

// ---- SERVIR FRONTEND (PRODUCCIÓN) ----
app.use(express.static(path.join(__dirname, "../frontend/dist")));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
});

// ---- SERVER ----
const PORT = 3000; // 🔧 usamos uno solo
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});


