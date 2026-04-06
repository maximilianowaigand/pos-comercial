import { useEffect, useState } from "react";
import {
  addItem,
  decreaseItem,
  removeItem
} from "../utils/cartFuncions";
import { fetchTotales } from "../utils/api";

export default function usePOS() {
  /* ESTADOS */
  const [venta, setVenta] = useState([]);
  const [totalesDia, setTotalesDia] = useState({
  efectivo: 0,
  transferencia: 0,
  debito: 0,
  totalDia: 0
});
  const [totalMes, setTotalMes] = useState(0);
  const [categoria, setCategoria] = useState("Todos");

  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [mostrarCliente, setMostrarCliente] = useState(false);
  const [datosCliente, setDatosCliente] = useState(null);

  /* EFECTOS */
  useEffect(() => {
    obtenerTotales();
  }, []);

  /* FUNCIONES */
  function obtenerTotales() {
  fetchTotales()
    .then((data) => {
      setTotalesDia({
        efectivo: data.efectivo,
        transferencia: data.transferencia,
        debito: data.debito,
        totalDia: data.totalDia
      });

      setTotalMes(data.totalMes);
    })
    .catch(err => console.error("Error obteniendo totales:", err));
}




  function agregar(prod) {
    setVenta(prev => addItem(prev, prod));
  }

  function disminuir(id) {
    setVenta(prev => decreaseItem(prev, id));
  }

  function borrar(id) {
    setVenta(prev => prev.filter(p => p.id !== id));
  }

  function limpiarVenta() {
    setVenta([]);
    setDatosCliente(null);
  }

  function handleMetodoPagoChange(value) {
    setMetodoPago(value);
    setMostrarCliente(value !== "efectivo");
  }

  function actualizarPrecio(id, nuevoPrecio) {
  setVenta(prev =>
    prev.map(item =>
      item.id === id
        ? { ...item, precio: nuevoPrecio }
        : item
    )
  );
}

  /* DERIVADOS */
  const total = venta.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0
  ); // solo referencia para mostrar en UI

  return {
    // estados
    venta,
    totalMes,
    totalesDia,
    metodoPago,
    mostrarCliente,
    datosCliente,
    categoria,

    // setters expuestos
    setDatosCliente,
    setCategoria,
    setTotalesDia,

    // lógica
    total, // uso para mostrar en pantalla, no para backend
    agregar,
    disminuir,
    borrar,
    limpiarVenta,
    obtenerTotales,
    handleMetodoPagoChange,
    actualizarPrecio
  };
}