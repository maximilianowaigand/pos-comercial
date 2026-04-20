import { Routes, Route } from "react-router-dom";
import { VentasProvider } from "./context/VentasContext";
import { ProductosProvider } from "./context/ProductosContext";
import POS from "./pages/pos";
import HistorialVentas from "./components/HistorialVentas/HistorialVentas";
import CrearProducto from "./components/CrearProducto/CrearProducto";


function App() {
  return (
    <VentasProvider>
      <ProductosProvider>
        <Routes>
          <Route path="/" element={<POS />} />
          <Route path="/historial" element={<HistorialVentas />} />
          <Route path="/crear-producto" element={<CrearProducto />} />
        </Routes>
      </ProductosProvider>
    </VentasProvider>
  );
}

export default App;
