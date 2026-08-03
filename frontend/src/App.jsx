import "./App.css";
import { Routes, Route } from "react-router-dom";
import { VentasProvider } from "./context/VentasContext";
import { ProductosProvider } from "./context/ProductosContext";
import NavBar from "./components/NavBar/NavBar";
import FacturacionPerfil from "./components/FacturacionPerfil/FacturacionPerfil";
import HistorialVentas from "./components/HistorialVentas/HistorialVentas";
import CrearProducto from "./components/CrearProducto/CrearProducto";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/Pos";
import Caja from "./pages/Caja";
import { AlertasProvider } from "./context/AlertasContext";



function App() {
  return (
    <div className="App">
      <VentasProvider>
        <ProductosProvider>
          <AlertasProvider>
            <NavBar />
            <FacturacionPerfil />
            <main className="app-content">
              <Routes>
                <Route path="/" element={<POS />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/historial" element={<HistorialVentas />} />
                <Route path="/crear-producto" element={<CrearProducto />} />
                <Route path="/caja" element={<Caja />} />
                <Route path="*" element={<h1>404 not found</h1>} />
              </Routes>
            </main>
          </AlertasProvider>
        </ProductosProvider>
      </VentasProvider>
    </div>
  );
}

export default App;
