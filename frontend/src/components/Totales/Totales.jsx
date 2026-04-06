export default function Totales({ totalesDia, totalMes }) {
  return (
    <div
      style={{
        background: "orange",
        padding: 20,
        borderRadius: 10,
        marginBottom: 20
      }}
    >
      <h2>Resumen de Ventas</h2>

      <div style={{ display: "flex", gap: 30 }}>
        <div>
          <h4>💵 Efectivo</h4>
          <p>${totalesDia.efectivo}</p>
        </div>

        <div>
          <h4>🏦 Transferencia</h4>
          <p>${totalesDia.transferencia}</p>
        </div>

        <div>
          <h4>💳 Tarjeta</h4>
          <p>${totalesDia.debito}</p>
        </div>
      </div>

      <hr />

      <h3>Total Día: ${totalesDia.totalDia}</h3>
      <h3>Total Mes: ${totalMes}</h3>
    </div>
  );
}