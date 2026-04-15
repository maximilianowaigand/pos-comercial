import { useVentas } from "../../context/VentasContext";

export default function HistorialVentas() {


  const { ventas } = useVentas();

  return (
    <div style={{ padding: 20 }}>
      <h2>Historial de Ventas</h2>

      {ventas.length === 0 ? (
        <p>No hay ventas registradas.</p>
      ) : (
        <table border="1" cellPadding="8" cellSpacing="0">
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
            {ventas.map((v) => (
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
      )}
    </div>
  );
}