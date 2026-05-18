import { useEffect, useMemo, useState } from "react";
import styles from "./Dashboard.module.css";

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatPercent(value) {
  const numero = Number(value || 0);
  const prefijo = numero > 0 ? "+" : "";
  return `${prefijo}${numero.toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function getLocalDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(fecha, dias) {
  const date = new Date(`${fecha}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().slice(0, 10);
}

function addMonths(month, amount) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

function StatLine({ label, actual, comparado, variacion, money = false }) {
  const deltaNumber = Number(variacion || 0);
  const deltaClass =
    deltaNumber > 0
      ? styles.deltaPositive
      : deltaNumber < 0
        ? styles.deltaNegative
        : styles.deltaNeutral;

  return (
    <div className={styles.statLine}>
      <span>{label}</span>
      <strong>{money ? formatMoney(actual) : actual ?? 0}</strong>
      <small>{money ? formatMoney(comparado) : comparado ?? 0}</small>
      <em className={deltaClass}>{formatPercent(variacion)}</em>
    </div>
  );
}

const CHART_METRICS = [
  { key: "clientes", label: "Clientes", money: false },
  { key: "total", label: "Total vendido", money: true },
  { key: "ticketPromedio", label: "Ticket promedio", money: true },
  { key: "descuentosOtorgados", label: "Descuentos", money: false },
  { key: "totalDescuentos", label: "Monto descontado", money: true },
];

function PeriodPanel({ title, actualLabel, compareLabel, data, children }) {
  const actual = data?.actual ?? {};
  const comparado = data?.comparado ?? {};
  const variacion = data?.variacion ?? {};

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
          <p>
            Actual: {actualLabel} · Comparado: {compareLabel}
          </p>
        </div>
        {children}
      </div>

      <div className={styles.statTable}>
        <div className={styles.statHead}>
          <span>Metrica</span>
          <strong>Actual</strong>
          <small>Comparado</small>
          <em>Var.</em>
        </div>
        <StatLine
          label="Clientes"
          actual={actual.clientes}
          comparado={comparado.clientes}
          variacion={variacion.clientes}
        />
        <StatLine
          label="Total vendido"
          actual={actual.total}
          comparado={comparado.total}
          variacion={variacion.total}
          money
        />
        <StatLine
          label="Ticket promedio"
          actual={actual.ticketPromedio}
          comparado={comparado.ticketPromedio}
          variacion={variacion.ticketPromedio}
          money
        />
        <StatLine
          label="Descuentos otorgados"
          actual={actual.descuentosOtorgados}
          comparado={comparado.descuentosOtorgados}
          variacion={variacion.descuentosOtorgados}
        />
        <StatLine
          label="Total descuentos"
          actual={actual.totalDescuentos}
          comparado={comparado.totalDescuentos}
          variacion={variacion.totalDescuentos}
          money
        />
      </div>
    </article>
  );
}

export default function Dashboard() {
  const today = useMemo(() => getLocalDate(), []);
  const currentMonth = today.slice(0, 7);

  const [filters, setFilters] = useState({
    dia: today,
    diaComparar: addDays(today, -1),
    semana: today,
    semanaComparar: addDays(today, -7),
    mes: currentMonth,
    mesComparar: addMonths(currentMonth, -1),
    horaDia: today,
    horaComparar: addDays(today, -1),
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState("total");

  useEffect(() => {
    const fetchStats = async () => {
      const params = new URLSearchParams(filters);
      setLoading(true);

      try {
        const res = await fetch(`/api/stats/dashboard?${params.toString()}`);
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [filters]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const ventasHoraActual = stats?.ventasPorHora?.actual?.serie ?? [];
  const ventasHoraComparada = stats?.ventasPorHora?.comparada?.serie ?? [];
  const maxHora = Math.max(
    1,
    ...ventasHoraActual.map((item) => Number(item.total || 0)),
    ...ventasHoraComparada.map((item) => Number(item.total || 0))
  );
  const maxProducto = Math.max(
    1,
    ...(stats?.productosPorMonto ?? []).map((item) => Number(item.monto || 0))
  );
  const selectedMetric =
    CHART_METRICS.find((metric) => metric.key === chartMetric) ?? CHART_METRICS[0];
  const periodBars = [
    { key: "dia", label: "Dia", data: stats?.dia },
    { key: "semana", label: "Semana", data: stats?.semana },
    { key: "mes", label: "Mes", data: stats?.mes },
  ];
  const maxPeriodValue = Math.max(
    1,
    ...periodBars.flatMap((period) => [
      Number(period.data?.actual?.[chartMetric] || 0),
      Number(period.data?.comparado?.[chartMetric] || 0),
    ])
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Clientes, ventas, descuentos, horarios fuertes y productos ordenados por monto vendido.
          </p>
        </div>
      </section>

      <section className={styles.filters}>
        <label>
          <span>Dia</span>
          <input
            type="date"
            value={filters.dia}
            onChange={(event) => updateFilter("dia", event.target.value)}
          />
        </label>
        <label>
          <span>Comparar dia</span>
          <input
            type="date"
            value={filters.diaComparar}
            onChange={(event) => updateFilter("diaComparar", event.target.value)}
          />
        </label>
        <label>
          <span>Semana</span>
          <input
            type="date"
            value={filters.semana}
            onChange={(event) => updateFilter("semana", event.target.value)}
          />
        </label>
        <label>
          <span>Comparar semana</span>
          <input
            type="date"
            value={filters.semanaComparar}
            onChange={(event) => updateFilter("semanaComparar", event.target.value)}
          />
        </label>
        <label>
          <span>Mes</span>
          <input
            type="month"
            value={filters.mes}
            onChange={(event) => updateFilter("mes", event.target.value)}
          />
        </label>
        <label>
          <span>Comparar mes</span>
          <input
            type="month"
            value={filters.mesComparar}
            onChange={(event) => updateFilter("mesComparar", event.target.value)}
          />
        </label>
      </section>

      {loading && <p className={styles.status}>Cargando metricas...</p>}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Comparacion visual</h2>
            <p>Elige una metrica y compara rapidamente dia, semana y mes.</p>
          </div>
          <div className={styles.metricTabs}>
            {CHART_METRICS.map((metric) => (
              <button
                key={metric.key}
                type="button"
                className={chartMetric === metric.key ? styles.metricActive : ""}
                onClick={() => setChartMetric(metric.key)}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.periodChart}>
          {periodBars.map((period) => {
            const actualValue = Number(period.data?.actual?.[chartMetric] || 0);
            const compareValue = Number(period.data?.comparado?.[chartMetric] || 0);
            const variation = Number(period.data?.variacion?.[chartMetric] || 0);
            const deltaClass =
              variation > 0
                ? styles.deltaPositive
                : variation < 0
                  ? styles.deltaNegative
                  : styles.deltaNeutral;

            return (
              <div key={period.key} className={styles.periodChartGroup}>
                <div className={styles.periodChartBars}>
                  <span
                    className={styles.chartActual}
                    style={{ height: `${(actualValue / maxPeriodValue) * 190}px` }}
                    title={`Actual: ${selectedMetric.money ? formatMoney(actualValue) : actualValue}`}
                  />
                  <span
                    className={styles.chartCompare}
                    style={{ height: `${(compareValue / maxPeriodValue) * 190}px` }}
                    title={`Comparado: ${selectedMetric.money ? formatMoney(compareValue) : compareValue}`}
                  />
                </div>
                <strong>{period.label}</strong>
                <div className={styles.periodValues}>
                  <small className={styles.valueActual}>
                    {selectedMetric.money ? formatMoney(actualValue) : actualValue}
                  </small>
                  <small className={styles.valueCompare}>
                    {selectedMetric.money ? formatMoney(compareValue) : compareValue}
                  </small>
                </div>
                <em className={deltaClass}>{formatPercent(variation)}</em>
              </div>
            );
          })}
        </div>

        <div className={styles.legend}>
          <span><i className={styles.legendActual} /> Actual</span>
          <span><i className={styles.legendCompare} /> Comparado</span>
        </div>
      </section>

      <section className={styles.periodGrid}>
        <PeriodPanel
          title="Dia"
          data={stats?.dia}
          actualLabel={formatDate(stats?.filtros?.dia)}
          compareLabel={formatDate(stats?.filtros?.diaComparar)}
        />
        <PeriodPanel
          title="Semana"
          data={stats?.semana}
          actualLabel={`${formatDate(stats?.filtros?.rangos?.semana?.inicio)} a ${formatDate(stats?.filtros?.rangos?.semana?.fin)}`}
          compareLabel={`${formatDate(stats?.filtros?.rangos?.semanaComparar?.inicio)} a ${formatDate(stats?.filtros?.rangos?.semanaComparar?.fin)}`}
        />
        <PeriodPanel
          title="Mes"
          data={stats?.mes}
          actualLabel={`${formatDate(stats?.filtros?.rangos?.mes?.inicio)} a ${formatDate(stats?.filtros?.rangos?.mes?.fin)}`}
          compareLabel={`${formatDate(stats?.filtros?.rangos?.mesComparar?.inicio)} a ${formatDate(stats?.filtros?.rangos?.mesComparar?.fin)}`}
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Ventas por hora</h2>
            <p>Cantidad de personas y monto por hora, comparando dos dias.</p>
          </div>
          <div className={styles.inlineFilters}>
            <label>
              <span>Dia</span>
              <input
                type="date"
                value={filters.horaDia}
                onChange={(event) => updateFilter("horaDia", event.target.value)}
              />
            </label>
            <label>
              <span>Comparar</span>
              <input
                type="date"
                value={filters.horaComparar}
                onChange={(event) => updateFilter("horaComparar", event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className={styles.hourChart}>
          {ventasHoraActual.map((actual, index) => {
            const comparada = ventasHoraComparada[index] ?? {};
            return (
              <div key={actual.hora} className={styles.hourGroup}>
                <div className={styles.hourBars}>
                  <span
                    className={styles.barActual}
                    style={{ height: `${(Number(actual.total || 0) / maxHora) * 170}px` }}
                    title={`${actual.hora}: ${actual.ventas} clientes · ${formatMoney(actual.total)}`}
                  />
                  <span
                    className={styles.barCompare}
                    style={{ height: `${(Number(comparada.total || 0) / maxHora) * 170}px` }}
                    title={`${comparada.hora ?? actual.hora}: ${comparada.ventas ?? 0} clientes · ${formatMoney(comparada.total)}`}
                  />
                </div>
                <strong>{actual.hora.slice(0, 2)}</strong>
                <small>{actual.ventas} / {comparada.ventas ?? 0}</small>
              </div>
            );
          })}
        </div>

        <div className={styles.legend}>
          <span><i className={styles.legendActual} /> {formatDate(filters.horaDia)}</span>
          <span><i className={styles.legendCompare} /> {formatDate(filters.horaComparar)}</span>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Productos mas vendidos por monto</h2>
            <p>Ordenados por dinero vendido, no por cantidad de unidades.</p>
          </div>
          <strong className={styles.panelTotal}>{filters.mes}</strong>
        </div>

        <div className={styles.productList}>
          {(stats?.productosPorMonto ?? []).map((producto, index) => (
            <div key={producto.id} className={styles.productRow}>
              <span>{index + 1}</span>
              <strong>{producto.nombre}</strong>
              <div>
                <i style={{ width: `${(Number(producto.monto || 0) / maxProducto) * 100}%` }} />
              </div>
              <em>{formatMoney(producto.monto)}</em>
            </div>
          ))}
          {!loading && (stats?.productosPorMonto ?? []).length === 0 && (
            <p className={styles.status}>No hay productos vendidos en este mes.</p>
          )}
        </div>
      </section>
    </div>
  );
}
