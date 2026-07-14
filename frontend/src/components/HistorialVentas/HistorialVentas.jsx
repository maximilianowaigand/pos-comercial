import { useState,useEffect } from "react";
import { useVentas } from "../../context/VentasContext";
import BackButton from "../BackButton/BackButton";
import { restoreFocusAfterNativeDialog, restoreKeyboardFocus } from "../../utils/keyboardFocus";
import styles from "./HistorialVentas.module.css";
import API from "../../config/api";

export default function HistorialVentas() {



  const {
  ventas,
  obtenerVentas,
  ventasError,
  loading,
  paginaActual,
  setPaginaActual,
  totalPages,
} = useVentas();

 
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroFacturacion, setFiltroFacturacion] = useState("");
  const [soloHoy, setSoloHoy] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");

  useEffect(() => {
      obtenerVentas(fechaSeleccionada, paginaActual);
      }, [obtenerVentas, paginaActual, fechaSeleccionada]);

  const hoy = new Date().toISOString().slice(0, 10);

  const ventasLista = Array.isArray(ventas) ? ventas : [];

  const ventasFiltradas = ventasLista.filter((v) => {
    const fechaVenta = v.fecha?.slice(0, 10);
    const coincidePerfil = !filtroPerfil || v.perfil_facturacion === filtroPerfil;
    const coincideMetodo = !filtroMetodo || v.medio_pago === filtroMetodo;
    const estadoFacturacion = v.facturacion_estado || "NO_REQUIERE";
    const coincideFacturacion =
      !filtroFacturacion ||
      estadoFacturacion === filtroFacturacion ||
      (filtroFacturacion === "PENDIENTE" && estadoFacturacion === "PROCESANDO");
    const coincideHoy = !soloHoy || fechaVenta === hoy;
    const coincideFecha = !fechaSeleccionada || fechaVenta === fechaSeleccionada;

    return (
    coincideMetodo &&
    coincideFacturacion &&
    coincideHoy &&
    coincideFecha &&
    coincidePerfil
    );
  });

  const ventasOrdenadas = [...ventasFiltradas].sort(
    (a, b) => Number(b.id_venta || 0) - Number(a.id_venta || 0)
  );

  const ventasFinal = ventasOrdenadas;

  const totalFiltrado = ventasFiltradas.reduce(
    (acc, v) => acc + Number(v.total),
    0
  );

  const getFacturacionLabel = (venta) => {
    const estado = venta.facturacion_estado || "NO_REQUIERE";

    if (estado === "NO_REQUIERE") return "No requiere";
    if (estado === "PENDIENTE") return "Pendiente";
    if (estado === "PROCESANDO") return "Procesando";
    if (estado === "FACTURADA") return venta.factura_numero
      ? `Facturada #${venta.factura_numero}`
      : "Facturada";
    if (estado === "ERROR") return "Error";
    return estado;
  };

  const reintentarFacturacion = async (venta) => {
    const confirmar = window.confirm(
      `Reintentar facturacion de la venta #${venta.id_venta}?`
    );
    restoreFocusAfterNativeDialog();
    if (!confirmar) return;

    try {
      const res = await fetch(
        `${API}/api/ventas/${venta.id_venta}/reintentar-facturacion`,
        { method: "POST" }
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo reintentar la facturacion");
        restoreFocusAfterNativeDialog();
        return;
      }

      await obtenerVentas();
      alert("Facturacion encolada para reintento");
      restoreFocusAfterNativeDialog();
    } catch (error) {
      console.error(error);
      alert("Error reintentando facturacion");
      restoreFocusAfterNativeDialog();
    }
  };

  const imprimirVenta = async (venta) => {
  const confirmar = window.confirm(
    `¿Reimprimir ticket #${venta.id_venta}?`
  );
  restoreFocusAfterNativeDialog();
  if (!confirmar) return;

  try {
    // 🔹 traer detalle real de la venta
    const resVenta = await fetch(`${API}/api/ventas/${venta.id_venta}`);
    const data = await resVenta.json();

    if (!resVenta.ok) {
      alert("Error obteniendo venta");
      restoreFocusAfterNativeDialog();
      return;
    }

    // 🔹 imprimir
    const resPrint = await fetch(`${API}/api/print`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: data.items,
        total: data.total,
        descuentoPorcentaje: data.descuento_porcentaje || 0,
        descuentoMonto: data.descuento_monto || 0,
        metodoPago: data.medio_pago,
        id_venta: data.id_venta,
      }),
    });
    const printData = await resPrint.json().catch(() => ({}));

    if (!resPrint.ok || printData.ok === false) {
      alert(printData.error || printData.warning || "Error al imprimir");
      restoreFocusAfterNativeDialog();
      return;
    }

    alert("Ticket reimpreso");
    restoreFocusAfterNativeDialog();
    restoreKeyboardFocus();
  } catch (error) {
    console.error(error);
    alert("Error en impresión");
    restoreFocusAfterNativeDialog();
  }
};

  return (
    <div className={styles.page}>
      <BackButton />
      <h2 className={styles.title}>Historial de Ventas</h2>

      <div className={styles.filters}>
        <select
          className={styles.control}
          value={filtroMetodo}
          onChange={(e) => {
            setFiltroMetodo(e.target.value);
            setPaginaActual(1);
          }}
        >
          <option value="">Todos</option>
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
        </select>

        <select
          className={styles.control}
          value={filtroFacturacion}
          onChange={(e) => {
            setFiltroFacturacion(e.target.value);
            setPaginaActual(1);
          }}
        >
          <option value="">Toda facturacion</option>
          <option value="FACTURADA">Facturadas</option>
          <option value="NO_REQUIERE">No requiere facturacion</option>
          <option value="PENDIENTE">Pendientes</option>
          <option value="ERROR">Con error</option>
        </select>

      <select
        className={styles.control}
        value={filtroPerfil}
        onChange={(e) => {
          setFiltroPerfil(e.target.value);
          setPaginaActual(1);
        }}
      >
        <option value="">Todos los perfiles</option>
        <option value="maximiliano">Maximiliano</option>
        <option value="yohanna">Yohanna</option>
        <option value="solo_ventas">Sin facturación</option>
      </select>


        <div className={styles.dateGroup}>
          <input
            className={styles.control}
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => {
                              setFechaSeleccionada(e.target.value);
                              setPaginaActual(1);
                            }}
          />

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={soloHoy}
              onChange={() => {
                setSoloHoy(!soloHoy);
                setPaginaActual(1);
              }}
            />
            Hoy
          </label>
        </div>

        <button
          type="button"
          className={styles.clearButton}
          onClick={() => {
            setFiltroMetodo("");
            setFiltroPerfil("");
            setFiltroFacturacion("");
            setSoloHoy(false);
            setFechaSeleccionada("");
            setPaginaActual(1);
            
          }}
        >
          Limpiar filtros
        </button>
      </div>

      <div className={styles.summaryBar}>
        <p className={styles.total}>
          Total filtrado: ${totalFiltrado.toFixed(2)}
        </p>

        <div className={styles.pagination}>
          <button
            disabled={paginaActual === 1}
            onClick={() => setPaginaActual((p) => p - 1)}
          >
            ← Anterior
          </button>

          <span>
            Página {paginaActual} de {totalPages}
          </span>

          <button
            disabled={paginaActual >= totalPages}
            onClick={() => setPaginaActual((p) => p + 1)}
          >
            Siguiente →
          </button>
        </div>
      </div>

      {ventasError ? (
        <p className={styles.empty}>No se pudo cargar el historial: {ventasError}</p>
      ) : loading ? (
        <p className={styles.empty}>Cargando ventas...</p>
      ) : ventasLista.length === 0 ? (
        <p className={styles.empty}>No hay ventas registradas.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID Venta</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Metodo de Pago</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Facturacion</th>
                <th>Perfil</th>
                <th>Imprimir</th>
                <th>Productos</th>
              </tr>
            </thead>

            <tbody>
              {ventasFinal.map((v) => (
                <tr key={v.id_venta}>
                  <td>{v.id_venta}</td>
                  <td>{v.fecha}</td>
                  <td>{v.hora}</td>
                  <td>{v.medio_pago}</td>
                  <td>${v.total}</td>
                  <td>{v.estado}</td>
                  <td>
                    <div className={styles.billingCell}>
                      <span
                        className={`${styles.billingBadge} ${
                          styles[`billing_${v.facturacion_estado || "NO_REQUIERE"}`]
                        }`}
                        title={v.factura_error || ""}
                      >
                        {getFacturacionLabel(v)}
                      </span>

                      {v.facturacion_estado === "ERROR" && (
                        <>
                          {v.factura_error && (
                            <small className={styles.billingError}>
                              {v.factura_error}
                            </small>
                          )}
                          <button
                            type="button"
                            className={styles.retryButton}
                            onClick={() => reintentarFacturacion(v)}
                          >
                            Reintentar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td>{v.perfil_facturacion || "Sin facturación"}</td>
                  <td>
                      <button className={styles.printButton}
                      onClick={() => imprimirVenta(v)}> 🖨️
                      </button>
                    </td>
                  <td>
                    {Array.isArray(v.productos)
                      ? v.productos.join(", ")
                      : v.productos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
