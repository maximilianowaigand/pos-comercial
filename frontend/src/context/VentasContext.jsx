import { createContext, useContext, useEffect, useState } from "react";
import { addItem, decreaseItem, removeItem, calcularTotal } from "../utils/cartFuncions";
import { fetchTotales } from "../utils/api";

const VentasContext = createContext();

export function VentasProvider({ children }) {
  // 🛒 Carrito
  const [venta, setVenta] = useState([]);
  const [ventas, setVentas] = useState([]);
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

  const [loading, setLoading] = useState(true);

useEffect(() => {
  const init = async () => {
    await obtenerTotales();
    await obtenerVentas();
    setLoading(false);
  };

  init();
}, []);

  // 📡 Fetch totales
  async function obtenerTotales() {
    const data = await fetchTotales();
    setTotalesDia({
      efectivo: data.efectivo,
      transferencia: data.transferencia,
      tarjeta: data.debito,
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

  async function agregarVenta(body) {
  try {
    const res = await fetch("/api/ventas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    await res.json();

    // 🔥 TRAE LA DATA COMPLETA DESDE BACKEND
    await obtenerVentas();

    // 🔥 actualiza totales
    await obtenerTotales();

    limpiarVenta();

  } catch (error) {
    console.error("Error agregando venta:", error);
    throw error;
  }
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

  async function obtenerVentas() {
  try {
    const res = await fetch("/api/ventas");
    const data = await res.json();
    setVentas(data);
  } catch (error) {
    console.error("Error cargando ventas:", error);
  }
}

  return (
    <VentasContext.Provider value={{
      // carrito
      venta,
      total,
      agregarVenta,
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
      obtenerTotales,
      ventas,
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