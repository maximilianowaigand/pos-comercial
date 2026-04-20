import { createContext, useContext, useEffect, useState } from "react";
import { addItem, decreaseItem, removeItem, calcularTotal } from "../utils/cartFuncions";
import { fetchTotales } from "../utils/api";

const VentasContext = createContext();

export function VentasProvider({ children }) {

  const [venta, setVenta] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [mostrarCliente, setMostrarCliente] = useState(false);
  const [datosCliente, setDatosCliente] = useState(null);
  const [totalesDia, setTotalesDia] = useState({ efectivo: 0, transferencia: 0, debito: 0, totalDia: 0 });
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

  async function obtenerVentas() {
    try {
      const res = await fetch("/api/ventas");
      const data = await res.json();
      console.log("📦 Ventas:", data);
      const lista = Array.isArray(data) ? data : data.ventas;
      setVentas(lista ?? []);
    } catch (error) {
      console.error("Error cargando ventas:", error);
      setVentas([]);
    }
  }

  async function obtenerTotales() {
    const data = await fetchTotales();
    setTotalesDia({
      efectivo: data.efectivo,
      transferencia: data.transferencia,
      tarjeta: data.tarjeta,
      totalDia: data.totalDia
    });
    setTotalMes(data.totalMes);
  }

  async function agregarVenta(body) {
    const res = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error("Error al guardar venta");

    await obtenerVentas();  // ✅ refresca historial
    await obtenerTotales(); // ✅ refresca totales
    limpiarVenta();         // ✅ limpia carrito
  }

  function agregar(prod) { setVenta(prev => addItem(prev, prod)); }
  function disminuir(id) { setVenta(prev => decreaseItem(prev, id)); }
  function borrar(id) { setVenta(prev => removeItem(prev, id)); }

  function limpiarVenta() {
    setVenta([]);
    setDatosCliente(null);
  }

  function actualizarPrecio(id, nuevoPrecio) {
    setVenta(prev =>
      prev.map(item => item.id === id ? { ...item, precio: nuevoPrecio } : item)
    );
  }

  function handleMetodoPagoChange(value) {
    setMetodoPago(value);
    setMostrarCliente(value !== "efectivo");
  }

  const total = calcularTotal(venta);

  return (
    <VentasContext.Provider value={{
      venta, total, ventas,
      agregarVenta, agregar, disminuir, borrar, limpiarVenta, actualizarPrecio,
      metodoPago, mostrarCliente, datosCliente, setDatosCliente, handleMetodoPagoChange,
      totalesDia, totalMes, obtenerTotales,
      loading
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