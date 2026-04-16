import { useVentas } from "../../context/VentasContext";
import { useState } from "react";

export default function HistorialVentas() {

  const { ventas } = useVentas();

  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [soloHoy, setSoloHoy] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");

  const hoy = new Date().toISOString().slice(0, 10);

  // 🎯 FILTRAR
  const ventasFiltradas = ventas.filter((v) => {
  const fechaVenta = v.fecha?.slice(0, 10);

  const coincideMetodo =
    !filtroMetodo || v.medio_pago === filtroMetodo;

  const coincideHoy =
    !soloHoy || fechaVenta === hoy;

  const coincideFecha =
    !fechaSeleccionada || fechaVenta === fechaSeleccionada;

  return coincideMetodo && coincideHoy && coincideFecha;
});

  // 🎯 ORDEN + LIMITE
  const ventasFinal = ventasFiltradas
    .slice(-20)
    .reverse();

  // 💰 TOTAL
  const totalFiltrado = ventasFiltradas.reduce(
    (acc, v) => acc + Number(v.total),
    0
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Historial de Ventas</h2>

      {/* 🔎 FILTROS */}
      <div style={{ marginBottom: 10, display: "flex", gap: 10 }}>
        <select
          value={filtroMetodo}
          onChange={(e) => setFiltroMetodo(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
        </select>

        <label>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
          />
          <input
            type="checkbox"
            checked={soloHoy}
            onChange={() => setSoloHoy(!soloHoy)}
          />
          Hoy
        </label>

        <button
        onClick={() => {
          setFiltroMetodo("");
          setSoloHoy(false);
          setFechaSeleccionada("");
        }}
      >
        Limpiar filtros
      </button>
      </div>

      {/* 💰 TOTAL */}
      <h3>Total filtrado: ${totalFiltrado}</h3>

      {ventas.length === 0 ? (
        <p>No hay ventas registradas.</p>
      ) : (
        <div
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            border: "1px solid #ccc"
          }}
        >
          <table border="1" cellPadding="8" cellSpacing="0" width="100%">
            <thead>
              <tr>
                <th>ID Venta</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Método de Pago</th>
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