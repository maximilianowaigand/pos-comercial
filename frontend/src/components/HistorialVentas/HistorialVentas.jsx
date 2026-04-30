import { useState } from "react";
import { useVentas } from "../../context/VentasContext";
import BackButton from "../BackButton/BackButton";
import { restoreFocusAfterNativeDialog, restoreKeyboardFocus } from "../../utils/keyboardFocus";
import styles from "./HistorialVentas.module.css";
import API from "../../config/api";

export default function HistorialVentas() {
  const { ventas } = useVentas();
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [soloHoy, setSoloHoy] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");

  const hoy = new Date().toISOString().slice(0, 10);

  const ventasFiltradas = ventas.filter((v) => {
    const fechaVenta = v.fecha?.slice(0, 10);

    const coincideMetodo = !filtroMetodo || v.medio_pago === filtroMetodo;
    const coincideHoy = !soloHoy || fechaVenta === hoy;
    const coincideFecha = !fechaSeleccionada || fechaVenta === fechaSeleccionada;

    return coincideMetodo && coincideHoy && coincideFecha;
  });

  const ventasFinal = [...ventasFiltradas]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 20);

  const totalFiltrado = ventasFiltradas.reduce(
    (acc, v) => acc + Number(v.total),
    0
  );

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

    if (!resPrint.ok) {
      alert("Error al imprimir");
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
          onChange={(e) => setFiltroMetodo(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
        </select>

        <div className={styles.dateGroup}>
          <input
            className={styles.control}
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
          />

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={soloHoy}
              onChange={() => setSoloHoy(!soloHoy)}
            />
            Hoy
          </label>
        </div>

        <button
          type="button"
          className={styles.clearButton}
          onClick={() => {
            setFiltroMetodo("");
            setSoloHoy(false);
            setFechaSeleccionada("");
          }}
        >
          Limpiar filtros
        </button>
      </div>

      <h3 className={styles.total}>Total filtrado: ${totalFiltrado}</h3>

      {ventas.length === 0 ? (
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
