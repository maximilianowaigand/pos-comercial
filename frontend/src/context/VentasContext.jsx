/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { addItem, decreaseItem, removeItem, calcularTotal } from "../utils/cartFuncions";
import { fetchTotales } from "../utils/api";
import { requiereFacturacionAutomatica } from "../utils/facturacion";
import API from "../config/api";

const VentasContext = createContext();

function normalizarNumero(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizarItems(items = []) {
  return items
    .map((item) => ({
      producto_id: String(item.producto_id ?? item.id_producto ?? item.id ?? item.nombre),
      cantidad: normalizarNumero(item.cantidad),
      precio_unitario: normalizarNumero(item.precio_unitario ?? item.precio),
    }))
    .sort((a, b) => a.producto_id.localeCompare(b.producto_id));
}

function ventasSonIguales(actual, anterior) {
  const itemsActuales = normalizarItems(actual.items);
  const itemsAnteriores = normalizarItems(anterior.items);

  if (actual.metodo_pago !== anterior.medio_pago) return false;
  if (
    normalizarNumero(actual.descuento_porcentaje) !==
    normalizarNumero(anterior.descuento_porcentaje)
  ) {
    return false;
  }
  if (itemsActuales.length !== itemsAnteriores.length) return false;

  return itemsActuales.every((item, index) => {
    const anteriorItem = itemsAnteriores[index];
    return (
      item.producto_id === anteriorItem.producto_id &&
      item.cantidad === anteriorItem.cantidad &&
      item.precio_unitario === anteriorItem.precio_unitario
    );
  });
}

function getFechaLocal() {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, "0");
  const day = String(ahora.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function leerJsonSeguro(res) {
  const text = await res.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Respuesta invalida del servidor: ${text.slice(0, 120)}`);
  }
}

async function fetchConTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function VentasProvider({ children }) {
  const [venta, setVenta] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [metodoPago, setMetodoPago] = useState("");
  const [mostrarCliente, setMostrarCliente] = useState(false);
  const [datosCliente, setDatosCliente] = useState(null);
  const [facturarVenta, setFacturarVenta] = useState(false);
  const [perfilesFacturacion, setPerfilesFacturacion] = useState([]);
  const [perfilFacturacion, setPerfilFacturacion] = useState("");
  const [descuentoPct, setDescuentoPct] = useState(0);
  const [totales, setTotales] = useState({
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
    totalDia: 0,
    totalMes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [ventasError, setVentasError] = useState("");

  useEffect(() => {
    const init = async () => {
      await obtenerTotales();
      await obtenerVentas();
      await obtenerPerfilesFacturacion();
      setLoading(false);
    };
    init();

    const interval = setInterval(() => {
      obtenerVentas();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const guardado = JSON.parse(
        localStorage.getItem("perfilFacturacionDia") || "null"
      );

      if (guardado?.fecha && guardado.fecha !== getFechaLocal()) {
        setPerfilFacturacion("");
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  async function obtenerVentas() {
    try {
      const res = await fetchConTimeout(`${API}/api/ventas`);
      const data = await leerJsonSeguro(res);

      if (!res.ok) {
        throw new Error(data?.error || "Error cargando ventas");
      }

      if (!data) {
        throw new Error("El servidor no devolvio ventas");
      }

      const lista = Array.isArray(data) ? data : data.ventas;
      setVentas(lista ?? []);
      setVentasError("");
    } catch (error) {
      console.error("Error cargando ventas:", error);
      setVentas([]);
      setVentasError(
        error.name === "AbortError"
          ? "El servidor tardo demasiado en responder"
          : error.message || "Error cargando ventas"
      );
    }
  }

  async function obtenerPerfilesFacturacion() {
    try {
      const res = await fetch("/api/arca/perfiles");
      const data = await res.json();
      const perfiles = Array.isArray(data.profiles) ? data.profiles : [];
      const fecha = getFechaLocal();
      const guardado = JSON.parse(
        localStorage.getItem("perfilFacturacionDia") || "null"
      );
      const perfilGuardado =
        guardado?.fecha === fecha &&
        perfiles.some((perfil) => perfil.id === guardado.perfilId && perfil.available)
          ? guardado.perfilId
          : "";

      setPerfilesFacturacion(perfiles);
      setPerfilFacturacion(perfilGuardado);
    } catch (error) {
      console.error("Error cargando perfiles de facturacion:", error);
      setPerfilesFacturacion([]);
    }
  }

  async function obtenerTotales() {
    try {
      const data = await fetchTotales();
      setTotales({
        efectivo: data.efectivo,
        transferencia: data.transferencia,
        tarjeta: data.tarjeta,
        totalDia: data.totalDia,
        totalMes: data.totalMes,
      });
    } catch (error) {
      console.error("Error cargando totales:", error);
    }
  }

  async function agregarVenta(body) {
    try {
      console.log("[VENTA] Enviando venta al backend:", body);

      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Error al guardar venta");
      }

      const data = await res.json();
      await obtenerVentas();
      await obtenerTotales();
      limpiarVenta();
      return data;
    } catch (err) {
      console.error("Error en agregarVenta:", err);
      throw err;
    }
  }

  async function confirmarVentaRepetida(body) {
    const ultimaVenta = ventas.reduce((ultima, actual) => {
      if (!ultima) return actual;
      return Number(actual.id_venta) > Number(ultima.id_venta) ? actual : ultima;
    }, null);

    if (!ultimaVenta?.id_venta) return true;

    try {
      const res = await fetch(`${API}/api/ventas/${ultimaVenta.id_venta}`);
      if (!res.ok) return true;

      const ventaAnterior = await res.json();
      if (!ventasSonIguales(body, ventaAnterior)) return true;

      return window.confirm(
        `La venta es igual a la anterior (#${ultimaVenta.id_venta}).\n\n¿Confirmar de todos modos?`
      );
    } catch (error) {
      console.error("Error verificando venta repetida:", error);
      return true;
    }
  }

  function agregar(prod) {
    setVenta((prev) => addItem(prev, prod));
  }

  function disminuir(id) {
    setVenta((prev) => decreaseItem(prev, id));
  }

  function borrar(id) {
    setVenta((prev) => removeItem(prev, id));
  }

  function limpiarVenta() {
    setVenta([]);
    setDatosCliente(null);
    setMetodoPago("");
    setMostrarCliente(false);
    setFacturarVenta(false);
    setDescuentoPct(0);
  }

  function actualizarPrecio(id, nuevoPrecio) {
    setVenta((prev) =>
      prev.map((item) => (item.id === id ? { ...item, precio: nuevoPrecio } : item))
    );
  }

  function handleMetodoPagoChange(value) {
    setMetodoPago(value);
    const requiereFactura = requiereFacturacionAutomatica(value);
    setMostrarCliente(requiereFactura);
    setFacturarVenta(requiereFactura);
  }

  function handleFacturarVentaChange(value) {
    setFacturarVenta(value);
    setMostrarCliente(value || requiereFacturacionAutomatica(metodoPago));
  }

  function seleccionarPerfilFacturacion(profileId) {
    const fecha = getFechaLocal();
    setPerfilFacturacion(profileId);
    localStorage.setItem(
      "perfilFacturacionDia",
      JSON.stringify({ fecha, perfilId: profileId })
    );
  }

  function actualizarDescuentoPct(value) {
    const numero = Number(value);
    if (Number.isNaN(numero)) {
      setDescuentoPct(0);
      return;
    }
    setDescuentoPct(Math.min(100, Math.max(0, numero)));
  }

  const subtotal = calcularTotal(venta);
  const descuentoMonto = Number((subtotal * (descuentoPct / 100)).toFixed(2));
  const total = Number((subtotal - descuentoMonto).toFixed(2));

  return (
    <VentasContext.Provider
      value={{
        venta,
        subtotal,
        descuentoPct,
        descuentoMonto,
        total,
        ventas,
        agregarVenta,
        confirmarVentaRepetida,
        agregar,
        disminuir,
        borrar,
        limpiarVenta,
        actualizarPrecio,
        metodoPago,
        mostrarCliente,
        facturarVenta,
        perfilesFacturacion,
        perfilFacturacion,
        seleccionarPerfilFacturacion,
        datosCliente,
        setDatosCliente,
        handleMetodoPagoChange,
        handleFacturarVentaChange,
        actualizarDescuentoPct,
        obtenerVentas,
        obtenerTotales,
        totales,
        loading,
        ventasError,
      }}
    >
      {children}
    </VentasContext.Provider>
  );
}

export function useVentas() {
  const context = useContext(VentasContext);
  if (!context) {
    throw new Error("useVentas debe usarse dentro de VentasProvider");
  }
  return context;
}
