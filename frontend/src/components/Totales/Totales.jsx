import styles from "./Totales.module.css";

export default function Totales({ totalesDia = {}, totalMes = 0 }) {
  const {
    efectivo = 0,
    transferencia = 0,
    tarjeta = 0,
    totalDia = 0,
  } = totalesDia;

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Resumen de Ventas</h2>

      <div className={styles.grid}>
        <div className={styles.metric}>
          <h4>Efectivo</h4>
          <p>${efectivo}</p>
        </div>

        <div className={styles.metric}>
          <h4>Transferencia</h4>
          <p>${transferencia}</p>
        </div>

        <div className={styles.metric}>
          <h4>Tarjeta</h4>
          <p>${tarjeta}</p>
        </div>
      </div>

      <hr className={styles.divider} />

      <div className={styles.totals}>
        <h3>Total Dia: ${totalDia}</h3>
        <h3>Total Mes: ${totalMes}</h3>
      </div>
    </section>
  );
}
