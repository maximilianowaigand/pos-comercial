import { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatPercent(value) {
  const numero = Number(value || 0);
  const prefijo = numero > 0 ? "+" : "";
  return `${prefijo}${numero.toFixed(1)}%`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats/dashboard");
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const hoy = stats?.hoy ?? {};
  const semanaActual = stats?.semanaActual ?? {};
  const mesActual = stats?.mesActual ?? {};
  const ventasPorHora = stats?.ventasPorHora ?? { serie: [], horaPico: null };
  const comparativas = stats?.comparativas ?? {};
  const maxVentasHora = Math.max(
    1,
    ...((ventasPorHora.serie ?? []).map((item) => Number(item.ventas || 0)))
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>
          Clientes por venta, ticket promedio y comparativas contra semanas y meses anteriores.
        </p>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <span className={styles.label}>Clientes del dia</span>
          <strong className={styles.value}>{loading ? "..." : hoy.clientes ?? 0}</strong>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Ticket promedio del dia</span>
          <strong className={styles.value}>
            {loading ? "..." : formatMoney(hoy.ticketPromedio)}
          </strong>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Clientes de la semana</span>
          <strong className={styles.value}>
            {loading ? "..." : semanaActual.clientes ?? 0}
          </strong>
          <small className={styles.delta}>
            vs semana pasada {loading ? "..." : formatPercent(comparativas.clientesSemana)}
          </small>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Ticket promedio semanal</span>
          <strong className={styles.value}>
            {loading ? "..." : formatMoney(semanaActual.ticketPromedio)}
          </strong>
          <small className={styles.delta}>
            vs semana pasada {loading ? "..." : formatPercent(comparativas.ticketPromedioSemana)}
          </small>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Clientes del mes</span>
          <strong className={styles.value}>
            {loading ? "..." : mesActual.clientes ?? 0}
          </strong>
          <small className={styles.delta}>
            vs mes pasado {loading ? "..." : formatPercent(comparativas.clientesMes)}
          </small>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Ticket promedio mensual</span>
          <strong className={styles.value}>
            {loading ? "..." : formatMoney(mesActual.ticketPromedio)}
          </strong>
          <small className={styles.delta}>
            vs mes pasado {loading ? "..." : formatPercent(comparativas.ticketPromedioMes)}
          </small>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Descuentos otorgados hoy</span>
          <strong className={styles.value}>
            {loading ? "..." : hoy.descuentosOtorgados ?? 0}
          </strong>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Total descuentos hoy</span>
          <strong className={styles.value}>
            {loading ? "..." : formatMoney(hoy.totalDescuentos)}
          </strong>
        </article>
      </section>

      <section className={styles.dualGrid}>
        <article className={styles.panel}>
          <h2 className={styles.panelTitle}>Resumen de hoy</h2>
          <div className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <span>Total vendido</span>
              <strong>{loading ? "..." : formatMoney(hoy.total)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Clientes</span>
              <strong>{loading ? "..." : hoy.clientes ?? 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Promedio por cliente</span>
              <strong>{loading ? "..." : formatMoney(hoy.ticketPromedio)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Descuentos otorgados</span>
              <strong>{loading ? "..." : hoy.descuentosOtorgados ?? 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Total descontado</span>
              <strong>{loading ? "..." : formatMoney(hoy.totalDescuentos)}</strong>
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <h2 className={styles.panelTitle}>Resumen del mes</h2>
          <div className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <span>Total vendido</span>
              <strong>{loading ? "..." : formatMoney(mesActual.total)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Clientes</span>
              <strong>{loading ? "..." : mesActual.clientes ?? 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Promedio por cliente</span>
              <strong>{loading ? "..." : formatMoney(mesActual.ticketPromedio)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Descuentos otorgados</span>
              <strong>{loading ? "..." : mesActual.descuentosOtorgados ?? 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Total descontado</span>
              <strong>{loading ? "..." : formatMoney(mesActual.totalDescuentos)}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.chartHeader}>
          <div>
            <h2 className={styles.panelTitle}>Ventas por hora</h2>
            <p className={styles.chartSubtitle}>
              Asi puedes ver en que tramo del dia, de 7 a 21 hs, tienes mas movimiento.
            </p>
          </div>
          <div className={styles.peakCard}>
            <span>Hora pico</span>
            <strong>
              {loading
                ? "..."
                : ventasPorHora.horaPico?.ventas > 0
                  ? `${ventasPorHora.horaPico.hora} (${ventasPorHora.horaPico.ventas} ventas)`
                  : "Sin ventas hoy"}
            </strong>
          </div>
        </div>

        <div className={styles.chart}>
          {(ventasPorHora.serie ?? []).map((item) => (
            <div key={item.hora} className={styles.barGroup}>
              <span className={styles.barValue}>{loading ? "..." : item.ventas}</span>
              <div
                className={styles.bar}
                style={{
                  height: `${loading ? 0 : (Number(item.ventas || 0) / maxVentasHora) * 180}px`,
                }}
                title={`${item.hora} - ${item.ventas} ventas`}
              />
              <span className={styles.barLabel}>{item.hora.slice(0, 2)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
