import "./App.css";
import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import { VentasProvider } from "./context/VentasContext";
import { ProductosProvider } from "./context/ProductosContext";
import NavBar from "./components/NavBar/NavBar";
import HistorialVentas from "./components/HistorialVentas/HistorialVentas";
import CrearProducto from "./components/CrearProducto/CrearProducto";
import POS from "./pages/pos";


const [productoEditando, setProductoEditando] = useState(null);

function App() {
  return (
    <div className="App">
      <VentasProvider>
        <ProductosProvider>
          <NavBar />
          <main className="app-content">
            <Routes>
              <Route path="/" element={<POS />} />
              <Route path="/historial" element={<HistorialVentas />} />
              <Route path="/crear-producto" element={<CrearProducto 
              productoEditando={productoEditando}
              setProductoEditando={setProductoEditando}
                />
                }
              />
              <Route path="*" element={<h1>404 not found</h1>} />
            </Routes>
          </main>
        </ProductosProvider>
      </VentasProvider>
    </div>
  );
}

export default App;
