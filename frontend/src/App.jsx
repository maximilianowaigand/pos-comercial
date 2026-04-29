import "./App.css";
import { Routes, Route } from "react-router-dom";
import { VentasProvider } from "./context/VentasContext";
import { ProductosProvider } from "./context/ProductosContext";
import NavBar from "./components/NavBar/NavBar";
import HistorialVentas from "./components/HistorialVentas/HistorialVentas";
import CrearProducto from "./components/CrearProducto/CrearProducto";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/pos";



function App() {
  return (
    <div className="App">
      <VentasProvider>
        <ProductosProvider>
          <NavBar />
          <main className="app-content">
            <Routes>
              <Route path="/" element={<POS />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/historial" element={<HistorialVentas />} />
              <Route path="/crear-producto" element={<CrearProducto />} />
              <Route path="*" element={<h1>404 not found</h1>} />
            </Routes>
          </main>
        </ProductosProvider>
      </VentasProvider>
    </div>
  );
}

export default App;
