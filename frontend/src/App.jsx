import { Routes, Route } from "react-router-dom";
import { VentasProvider } from "./context/VentasContext";
import POS from "./pages/Pos";
import HistorialVentas from "./components/HistorialVentas/HistorialVentas";

function App() {
  return (
    <VentasProvider>
      <Routes>
        <Route path="/" element={<POS />} />
        <Route path="/historial" element={<HistorialVentas />} />
      </Routes>
    </VentasProvider>
  );
}

export default App;