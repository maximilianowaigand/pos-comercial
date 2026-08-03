/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { addItem, decreaseItem, removeItem, calcularTotal } from "../utils/cartFuncions";
import { fetchTotales } from "../utils/api";
import { pagosRequierenFacturacion } from "../utils/facturacion";
import API from "../config/api";

const VentasContext = createContext();

function normalizarNumero(value) {
  return Number(Number(value || 0).toFixed(2));
}

function montoPago(value) {
  return Number(String(value ?? "").replace(",", ".")) || 0;
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

  const pagosActuales = (actual.pagos || []).map((pago) => `${pago.medio_pago}:${normalizarNumero(pago.monto)}`).sort();
  const pagosAnteriores = (anterior.pagos || [{ medio_pago: anterior.medio_pago, monto: anterior.total }])
    .map((pago) => `${pago.medio_pago}:${normalizarNumero(pago.monto)}`).sort();
  if (pagosActuales.join("|") !== pagosAnteriores.join("|")) return false;
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
  const [pagos, setPagos] = useState([{ medio_pago: "", monto: "" }]);
  const [mostrarCliente, setMostrarCliente] = useState(false);
  const [incluirEfectivoFactura, setIncluirEfectivoFactura] = useState(false);
  const [datosCliente, setDatosCliente] = useState(null);
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
  const [totalVentas, setTotalVentas] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [paginaActual, setPaginaActual] = useState(1);

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

  const obtenerVentas = useCallback(async (fecha = "", page = 1) => {
      try {
        setLoading(true);
        setVentasError("");

        const url = fecha
          ? `${API}/api/ventas?fecha=${fecha}&page=${page}`
          : `${API}/api/ventas?page=${page}`;

        const res = await fetchConTimeout(url);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        setVentas(data.ventas || []);
        setTotalVentas(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPaginaActual(data.page || 1);

      } catch (error) {
        console.error("Error obteniendo ventas:", error);
        setVentasError(error.message || "Error obteniendo ventas");
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    const init = async () => {
      await obtenerTotales();
      await obtenerVentas();
      await obtenerPerfilesFacturacion();
      setLoading(false);
    };

    init();
  }, [obtenerVentas]);

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
      const res = await fetch(`${API}/api/ventas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Error al guardar venta");
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Error al guardar venta");
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
    setPagos([{ medio_pago: "", monto: "" }]);
    setMostrarCliente(false);
    setIncluirEfectivoFactura(false);
    setDescuentoPct(0);
  }

  function actualizarPrecio(id, nuevoPrecio) {
    setVenta((prev) =>
      prev.map((item) => (item.id === id ? { ...item, precio: nuevoPrecio } : item))
    );
  }

  function actualizarPago(index, field, value) {
    setPagos((prev) => {
      let siguientes = prev.map((pago, pagoIndex) => pagoIndex === index ? { ...pago, [field]: value } : pago);

      if (field === "monto" && index > 0) {
        const otrosPagos = siguientes.reduce(
          (acumulado, pago, pagoIndex) => pagoIndex > 0 && pagoIndex !== index
            ? acumulado + montoPago(pago.monto)
            : acumulado,
          0
        );
        const montoIngresado = Math.min(Math.max(0, montoPago(value)), Math.max(0, total - otrosPagos));
        siguientes = siguientes.map((pago, pagoIndex) => {
          if (pagoIndex === index) return { ...pago, monto: value === "" ? "" : montoIngresado };
          if (pagoIndex === 0) return { ...pago, monto: Number((total - otrosPagos - montoIngresado).toFixed(2)) };
          return pago;
        });
      }

      const requiereFactura = pagosRequierenFacturacion(siguientes);
      setMostrarCliente(requiereFactura);
      return siguientes;
    });
  }

  function agregarPago() {
    setPagos((prev) => {
      if (prev.length >= 3) return prev;
      const pagosActuales = prev.map((pago) => ({
        ...pago,
        monto: pago.monto === "" ? total.toFixed(2) : pago.monto,
      }));
      return [...pagosActuales, { medio_pago: "", monto: "" }];
    });
  }

  function eliminarPago(index) {
    setPagos((prev) => {
      const siguientes = prev.length === 1 ? [{ medio_pago: "", monto: "" }] : prev.filter((_, pagoIndex) => pagoIndex !== index);
      setMostrarCliente(pagosRequierenFacturacion(siguientes));
      return siguientes;
    });
  }

  function actualizarIncluirEfectivoFactura(value) {
    setIncluirEfectivoFactura(value);
    setMostrarCliente(value || pagosRequierenFacturacion(pagos));
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
  const totalPagos = pagos.length === 1 && pagos[0].medio_pago
    ? total
    : Number(pagos.reduce((acc, pago) => acc + montoPago(pago.monto), 0).toFixed(2));

  useEffect(() => {
    if (pagos.length <= 1) return;

    setPagos((prev) => {
      const pagosSecundarios = prev.slice(1).reduce((acc, pago) => acc + montoPago(pago.monto), 0);
      const saldo = Number(Math.max(0, total - pagosSecundarios).toFixed(2));
      if (montoPago(prev[0].monto) === saldo) return prev;
      return prev.map((pago, index) => index === 0 ? { ...pago, monto: saldo } : pago);
    });
  }, [total, pagos.length]);

  return (
    <VentasContext.Provider
      value={{
        paginaActual,
        setPaginaActual,
        totalPages,
        totalVentas,
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
        pagos,
        totalPagos,
        actualizarPago,
        agregarPago,
        eliminarPago,
        mostrarCliente,
        incluirEfectivoFactura,
        actualizarIncluirEfectivoFactura,
        perfilesFacturacion,
        perfilFacturacion,
        seleccionarPerfilFacturacion,
        datosCliente,
        setDatosCliente,
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
