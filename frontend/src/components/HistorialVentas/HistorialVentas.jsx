import { useState } from "react";
import { useVentas } from "../../context/VentasContext";
import BackButton from "../BackButton/BackButton";
import styles from "./HistorialVentas.module.css";

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
