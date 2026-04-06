const express = require("express");
const cors = require("cors");


const app = express();

app.use(cors());
app.use(express.json());

const ventasRoutes = require("./routes/ventasRoutes");
const printRoutes = require("./routes/printRoutes");
const exportRoutes = require("./routes/exportRoutes");
const statsRoute = require("./routes/statsRoute");
const facturaRoutes = require("./routes/facturaRoutes");
const productosRoutes = require("./routes/productosRoutes");
const climaRoutes = require("./routes/clima");


app.use("/api/ventas", ventasRoutes);
app.use("/api", printRoutes);
app.use("/api", exportRoutes);
app.use("/api", statsRoute);
app.use("/api", facturaRoutes);
app.use("/api", require("./routes/testFactura"));
app.use("/productos", productosRoutes);
app.use("/api/clima", climaRoutes);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
