
export default function Totales({ totalesDia = {}, totalMes = 0 }) {
  const {
    efectivo = 0,
    transferencia = 0,
    tarjeta = 0,
    totalDia = 0
  } = totalesDia;

  return (
    <div style={{ background: "orange", padding: 20, borderRadius: 10 }}>
      <h2>Resumen de Ventas</h2>

      <div style={{ display: "flex", gap: 30 }}>
        <div>
          <h4>💵 Efectivo</h4>
          <p>${efectivo}</p>
        </div>

        <div>
          <h4>🏦 Transferencia</h4>
          <p>${transferencia}</p>
        </div>

        <div>
          <h4>💳 Tarjeta</h4>
          <p>${tarjeta}</p>
        </div>
      </div>

      <hr />

      <h3>Total Día: ${totalDia}</h3>
      <h3>Total Mes: ${totalMes}</h3>
    </div>
  );
}