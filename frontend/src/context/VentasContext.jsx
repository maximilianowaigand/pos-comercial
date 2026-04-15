import { createContext, useContext, useEffect, useState } from "react";
import { addItem, decreaseItem, removeItem, calcularTotal } from "../utils/cartFuncions";
import { fetchTotales } from "../utils/api";

const VentasContext = createContext();

export function VentasProvider({ children }) {
  // 🛒 Carrito
  const [venta, setVenta] = useState([]);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [mostrarCliente, setMostrarCliente] = useState(false);
  const [datosCliente, setDatosCliente] = useState(null);

  // 📊 Totales del día/mes
  const [totalesDia, setTotalesDia] = useState({
    efectivo: 0,
    transferencia: 0,
    debito: 0,
    totalDia: 0
  });
  const [totalMes, setTotalMes] = useState(0);

  useEffect(() => {
    obtenerTotales();
  }, []);

  // 📡 Fetch totales
  async function obtenerTotales() {
    const data = await fetchTotales();
    setTotalesDia({
      efectivo: data.efectivo,
      transferencia: data.transferencia,
      debito: data.debito,
      totalDia: data.totalDia
    });
    setTotalMes(data.totalMes);
  }

  // 🛒 Acciones del carrito
  function agregar(prod) {
    setVenta(prev => addItem(prev, prod));
  }

  function disminuir(id) {
    setVenta(prev => decreaseItem(prev, id));
  }

  function borrar(id) {
    setVenta(prev => removeItem(prev, id));
  }

  function limpiarVenta() {
    setVenta([]);
    setDatosCliente(null);
  }

  function actualizarPrecio(id, nuevoPrecio) {
    setVenta(prev =>
      prev.map(item =>
        item.id === id ? { ...item, precio: nuevoPrecio } : item
      )
    );
  }

  function handleMetodoPagoChange(value) {
    setMetodoPago(value);
    setMostrarCliente(value !== "efectivo");
  }

  // 💰 Total derivado
  const total = calcularTotal(venta);

  return (
    <VentasContext.Provider value={{
      // carrito
      venta,
      total,
      agregar,
      disminuir,
      borrar,
      limpiarVenta,
      actualizarPrecio,
      // pago
      metodoPago,
      mostrarCliente,
      datosCliente,
      setDatosCliente,
      handleMetodoPagoChange,
      // totales
      totalesDia,
      totalMes,
      obtenerTotales
    }}>
      {children}
    </VentasContext.Provider>
  );
}

export function useVentas() {
  const context = useContext(VentasContext);
  if (!context) throw new Error("useVentas debe usarse dentro de VentasProvider");
  return context;
}