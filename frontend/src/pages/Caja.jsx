import { useEffect, useState } from "react";
import API from "../config/api";
import styles from "./Caja.module.css";

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function mesActual() {
  return fechaHoy().slice(0, 7);
}

function nuevoFormulario(tipo = "EGRESO") {
  return {
    tipo,
    categoria: "",
    descripcion: "",
    proveedor: "",
    monto: "",
    medio_pago: "transferencia",
    estado: "PENDIENTE",
    fecha: fechaHoy(),
    fecha_vencimiento: "",
    recurrente: false,
  };
}

const dinero = (monto) => `$${Number(monto || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const etiquetaMes = (mes) => new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit" }).format(new Date(`${mes}-01T12:00:00`));

function PagoModal({ movimiento, onClose, onConfirmar }) {
  const [pagos, setPagos] = useState([{ medio_pago: movimiento.medio_pago, monto: movimiento.monto }]);
  const totalPagado = pagos.reduce((total, pago) => total + (Number(pago.monto) || 0), 0);
  const actualizarPago = (indice, campo, valor) => setPagos((actuales) => actuales.map((pago, index) => index === indice ? { ...pago, [campo]: valor } : pago));
  const agregarSegundoPago = () => setPagos([{ ...pagos[0], monto: "" }, { medio_pago: "efectivo", monto: "" }]);
  const eliminarSegundoPago = () => setPagos([{ ...pagos[0], monto: movimiento.monto }]);

  return <div className={styles.modalOverlay} role="dialog" aria-modal="true">
    <form className={styles.paymentModal} onSubmit={(event) => { event.preventDefault(); onConfirmar(pagos); }}>
      <h2>{movimiento.tipo === "INGRESO" ? "Confirmar ingreso" : "Registrar pago"}</h2>
      <p>{movimiento.categoria} · Total: <strong>{dinero(movimiento.monto)}</strong></p>
      {pagos.map((pago, indice) => <div className={styles.paymentRow} key={indice}>
        <select value={pago.medio_pago} onChange={(e) => actualizarPago(indice, "medio_pago", e.target.value)}><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option></select>
        <input required type="number" min="0.01" step="0.01" value={pago.monto} onChange={(e) => actualizarPago(indice, "monto", e.target.value)} placeholder="Importe" />
      </div>)}
      {pagos.length === 1 ? <button className={styles.linkButton} type="button" onClick={agregarSegundoPago}>Dividir en dos medios de pago</button> : <button className={styles.linkButton} type="button" onClick={eliminarSegundoPago}>Quitar segundo medio de pago</button>}
      <p className={Math.abs(totalPagado - Number(movimiento.monto)) < 0.005 ? styles.paymentOk : styles.paymentError}>Ingresado: {dinero(totalPagado)} · Falta: {dinero(Number(movimiento.monto) - totalPagado)}</p>
      <div className={styles.modalActions}><button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button><button disabled={Math.abs(totalPagado - Number(movimiento.monto)) >= 0.005}>{movimiento.tipo === "INGRESO" ? "Marcar ingresado" : "Marcar pagado"}</button></div>
    </form>
  </div>;
}

function MontoRecurrenteModal({ movimiento, onClose, onGuardar }) {
  const [monto, setMonto] = useState(movimiento.monto);
  return <div className={styles.modalOverlay} role="dialog" aria-modal="true">
    <form className={styles.paymentModal} onSubmit={(event) => { event.preventDefault(); onGuardar(monto); }}>
      <h2>Modificar importe mensual</h2>
      <p>El nuevo importe se aplicará a los meses actual y futuros que sigan pendientes. Los ya pagados no cambian.</p>
      <label className={styles.amountLabel}>Importe mensual<input required autoFocus type="number" min="0.01" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
      <div className={styles.modalActions}><button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button><button>Guardar importe</button></div>
    </form>
  </div>;
}

function ReporteMensual({ reporte }) {
  if (!reporte?.actual) return null;
  const serie = reporte.serie || [];
  const seriesPorAnio = reporte.seriesPorAnio || [{ anio: reporte.actual.mes.slice(0, 4), serie }];
  const colores = ["#d96b2b", "#287143", "#7455a6", "#b54663", "#137b95", "#8a5b00"];
  const valores = seriesPorAnio.flatMap((linea) => linea.serie.map((item) => Number(item.balance || 0)));
  const minimo = Math.min(0, ...valores);
  const maximo = Math.max(0, ...valores);
  const rango = Math.max(1, maximo - minimo);
  const ancho = 700;
  const alto = 230;
  const margenX = 36;
  const margenY = 22;
  const x = (indice) => margenX + (indice * (ancho - margenX * 2)) / Math.max(1, serie.length - 1);
  const y = (valor) => margenY + ((maximo - valor) * (alto - margenY * 2)) / rango;
  const puntos = (linea) => linea.serie.map((item, indice) => `${x(indice)},${y(Number(item.balance || 0))}`).join(" ");
  const variacion = reporte.variacionBalance;

  return <section className={styles.card}>
    <div className={styles.reportHeader}><div><h2>Reporte mensual</h2><p>Comparación de {etiquetaMes(reporte.actual.mes)} contra {etiquetaMes(reporte.anterior.mes)}.</p></div><strong className={variacion === null ? styles.neutral : variacion >= 0 ? styles.positiveText : styles.negativeText}>{variacion === null ? "Sin base de comparación" : `${variacion >= 0 ? "+" : ""}${variacion.toFixed(1)}% de balance`}</strong></div>
    <div className={styles.reportCards}><article><span>Ventas POS</span><strong>{dinero(reporte.actual.ventasPos)}</strong><small>Mes anterior: {dinero(reporte.anterior.ventasPos)}</small></article><article><span>Costos de productos</span><strong>{dinero(reporte.actual.costosProductos)}</strong><small>Mes anterior: {dinero(reporte.anterior.costosProductos)}</small></article><article><span>Ingresos externos</span><strong>{dinero(reporte.actual.ingresosExternos)}</strong><small>Mes anterior: {dinero(reporte.anterior.ingresosExternos)}</small></article><article><span>Egresos</span><strong>{dinero(reporte.actual.egresos)}</strong><small>Mes anterior: {dinero(reporte.anterior.egresos)}</small></article><article><span>Resultado neto</span><strong>{dinero(reporte.actual.balance)}</strong><small>Mes anterior: {dinero(reporte.anterior.balance)}</small></article></div>
    <div className={styles.chartWrap}><h3>Balance anual comparado</h3><p>De enero a diciembre; cada línea representa un año.</p><svg className={styles.lineChart} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Gráfico de líneas del balance anual"><line x1={margenX} x2={ancho - margenX} y1={y(0)} y2={y(0)} className={styles.zeroLine} />{seriesPorAnio.map((linea, lineaIndice) => <g key={linea.anio}><polyline points={puntos(linea)} className={styles.balanceLine} style={{ stroke: colores[lineaIndice % colores.length] }} />{linea.serie.map((item, indice) => <circle key={item.mes} cx={x(indice)} cy={y(Number(item.balance || 0))} r="3.5" className={styles.balancePoint} style={{ stroke: colores[lineaIndice % colores.length] }}><title>{`${linea.anio} · ${etiquetaMes(item.mes)}: ${dinero(item.balance)}`}</title></circle>)}</g>)}{serie.map((item, indice) => <text key={item.mes} x={x(indice)} y={alto - 4} textAnchor="middle" className={styles.chartLabel}>{etiquetaMes(item.mes).split(" ")[0]}</text>)}</svg><div className={styles.chartLegend}>{seriesPorAnio.map((linea, indice) => <span key={linea.anio}><i style={{ background: colores[indice % colores.length] }} />{linea.anio}</span>)}</div></div>
  </section>;
}

function ArqueoDiario({ fecha, onFechaChange, caja, montoApertura, setMontoApertura, montoContado, setMontoContado, onGuardarApertura, onCerrar }) {
  const diferencia = montoContado === "" ? null : Number(montoContado) - Number(caja?.efectivoEsperado || 0);
  return <section className={styles.card}>
    <div className={styles.titleRow}>
      <div><h2>Arqueo de caja diario</h2><p>Controlá el efectivo físico contra las ventas y movimientos registrados.</p></div>
      <label className={styles.monthPicker}>Fecha<input type="date" value={fecha} onChange={(event) => onFechaChange(event.target.value)} /></label>
    </div>
    <div className={styles.cashSummary}>
      <article><span>Saldo inicial</span><strong>{dinero(caja?.montoApertura)}</strong></article>
      <article><span>Ventas en efectivo</span><strong>{dinero(caja?.ventasEfectivo)}</strong></article>
      <article><span>Ingresos en efectivo</span><strong>{dinero(caja?.ingresosEfectivo)}</strong></article>
      <article><span>Pagos en efectivo</span><strong>{dinero(caja?.egresosEfectivo)}</strong></article>
      <article><span>Efectivo esperado</span><strong>{dinero(caja?.efectivoEsperado)}</strong></article>
    </div>
    <div className={styles.cashForms}>
      <form onSubmit={onGuardarApertura} className={styles.cashForm}>
        <label>Saldo inicial<input required min="0" step="0.01" type="number" value={montoApertura} onChange={(event) => setMontoApertura(event.target.value)} /></label>
        <button>Guardar apertura</button>
      </form>
      <form onSubmit={onCerrar} className={styles.cashForm}>
        <label>Efectivo contado<input required min="0" step="0.01" type="number" value={montoContado} onChange={(event) => setMontoContado(event.target.value)} placeholder="0,00" /></label>
        <button>{caja?.cerrada ? "Actualizar cierre" : "Cerrar caja"}</button>
      </form>
    </div>
    <div className={`${styles.cashDifference} ${diferencia === null ? "" : diferencia === 0 ? styles.cashOk : styles.cashMismatch}`}><span>Diferencia de arqueo</span><strong>{diferencia === null ? "Ingresá el efectivo contado" : dinero(diferencia)}</strong>{caja?.cerrada && <small>Caja cerrada y guardada.</small>}</div>
  </section>;
}

export default function Caja() {
  const [form, setForm] = useState(nuevoFormulario());
  const [mes, setMes] = useState(mesActual());
  const [datos, setDatos] = useState({ resumen: {}, movimientos: [] });
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [movimientoAPagar, setMovimientoAPagar] = useState(null);
  const [recurrenteAEditar, setRecurrenteAEditar] = useState(null);
  const [fechaCaja, setFechaCaja] = useState(fechaHoy());
  const [cajaDiaria, setCajaDiaria] = useState(null);
  const [montoApertura, setMontoApertura] = useState("0");
  const [montoContado, setMontoContado] = useState("");

  const cargar = async () => {
    try {
      setCargando(true);
      const res = await fetch(`${API}/api/movimientos?mes=${mes}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDatos(data);
    } catch (error) {
      setMensaje(error.message || "No se pudieron cargar los movimientos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [mes]);

  const cargarCajaDiaria = async () => {
    try {
      const res = await fetch(`${API}/api/movimientos/caja-diaria?fecha=${fechaCaja}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCajaDiaria(data);
      setMontoApertura(String(data.montoApertura));
      setMontoContado(data.montoContado === null ? "" : String(data.montoContado));
    } catch (error) {
      setMensaje(error.message || "No se pudo cargar el arqueo de caja");
    }
  };

  useEffect(() => { cargarCajaDiaria(); }, [fechaCaja]);

  const cambiarTipo = (tipo) => {
    setForm((actual) => ({ ...actual, tipo, estado: "PENDIENTE" }));
  };

  const guardar = async (event) => {
    event.preventDefault();
    try {
      const res = await fetch(`${API}/api/movimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, monto: Number(form.monto) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensaje(form.recurrente ? "Movimiento recurrente creado para este y los próximos meses" : "Movimiento registrado");
      setForm(nuevoFormulario(form.tipo));
      await cargar();
      await cargarCajaDiaria();
    } catch (error) {
      setMensaje(error.message || "No se pudo guardar");
    }
  };

  const confirmarMovimiento = async (movimiento, pagos) => {
    const estado = movimiento.tipo === "INGRESO" ? "INGRESADO" : "PAGADO";
    try {
      const res = await fetch(`${API}/api/movimientos/${movimiento.id_movimiento}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, pagos: pagos.map((pago) => ({ ...pago, monto: Number(pago.monto) })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensaje(movimiento.tipo === "INGRESO" ? "Ingreso confirmado" : "Egreso marcado como pagado");
      setMovimientoAPagar(null);
      await cargar();
      await cargarCajaDiaria();
    } catch (error) {
      setMensaje(error.message || "No se pudo actualizar el estado");
    }
  };

  const guardarMontoRecurrente = async (monto) => {
    try {
      const res = await fetch(`${API}/api/movimientos/recurrentes/${recurrenteAEditar.id_recurrencia}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: Number(monto) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensaje("Importe mensual actualizado");
      setRecurrenteAEditar(null);
      await cargar();
    } catch (error) {
      setMensaje(error.message || "No se pudo actualizar el importe");
    }
  };

  const guardarApertura = async (event) => {
    event.preventDefault();
    try {
      const res = await fetch(`${API}/api/movimientos/caja-diaria/${fechaCaja}/apertura`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monto_apertura: Number(montoApertura) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCajaDiaria(data);
      setMensaje("Apertura de caja guardada");
    } catch (error) { setMensaje(error.message || "No se pudo guardar la apertura"); }
  };

  const cerrarCaja = async (event) => {
    event.preventDefault();
    try {
      const res = await fetch(`${API}/api/movimientos/caja-diaria/${fechaCaja}/cierre`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monto_contado: Number(montoContado) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCajaDiaria(data);
      setMensaje(data.diferencia === 0 ? "Caja cerrada sin diferencias" : `Caja cerrada con una diferencia de ${dinero(data.diferencia)}`);
    } catch (error) { setMensaje(error.message || "No se pudo cerrar la caja"); }
  };

  const { resumen = {}, movimientos = [], proveedores = [], categorias = [], reporteMensual } = datos;
  return <div className={styles.page}>
    <section className={styles.card}>
      <div className={styles.titleRow}>
        <div><h1>Caja mensual</h1><p>Resultado de ventas, costos de productos, ingresos externos y gastos del negocio.</p></div>
        <label className={styles.monthPicker}>Mes<input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label>
      </div>
      <div className={styles.summary}>
        <article><span>Ventas desde POS</span><strong>{dinero(resumen.ventasPos)}</strong><small>{resumen.ticketsPos || 0} tickets</small></article>
        <article><span>Otros ingresos confirmados</span><strong>{dinero(resumen.ingresosExternos)}</strong><small>{dinero(resumen.ingresosPendientes)} pendiente</small></article>
        <article><span>Costos de productos</span><strong>{dinero(resumen.costosProductos)}</strong><small>Según los productos vendidos</small></article>
        <article><span>Egresos pagados</span><strong>{dinero(resumen.egresos)}</strong><small>{dinero(resumen.egresosPendientes)} pendiente</small></article>
        <article className={resumen.balance >= 0 ? styles.positive : styles.negative}><span>Resultado neto</span><strong>{dinero(resumen.balance)}</strong><small>Ingresos confirmados − costos − gastos pagados</small></article>
      </div>
    </section>
    <ArqueoDiario fecha={fechaCaja} onFechaChange={setFechaCaja} caja={cajaDiaria} montoApertura={montoApertura} setMontoApertura={setMontoApertura} montoContado={montoContado} setMontoContado={setMontoContado} onGuardarApertura={guardarApertura} onCerrar={cerrarCaja} />
    <ReporteMensual reporte={reporteMensual} />

    <section className={styles.card}>
      <h2>Agregar ingreso o egreso</h2>
      <p>Usá “repetir todos los meses” para alquiler, servicios, plataformas u otros importes periódicos.</p>
      <form className={styles.form} onSubmit={guardar}>
        <select value={form.tipo} onChange={(e) => cambiarTipo(e.target.value)}><option value="EGRESO">Gasto / egreso</option><option value="INGRESO">Ingreso externo</option></select>
        <div className={styles.fieldWithSuggestions}><input required list="categorias-caja" placeholder="Categoría (ej. PedidosYa, alquiler)" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /><datalist id="categorias-caja">{[...new Set(["PedidosYa", "Rappi", "Venta mayorista", "Alquiler", "Luz", "Gas", "Sueldos", ...categorias])].map((categoria) => <option key={categoria} value={categoria} />)}</datalist>{categorias.length > 0 && <div className={styles.quickOptions}>{categorias.slice(0, 6).map((categoria) => <button type="button" key={categoria} onClick={() => setForm({ ...form, categoria })}>{categoria}</button>)}</div>}</div>
        <input placeholder="Descripción opcional" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        {form.tipo === "EGRESO" && <div className={styles.fieldWithSuggestions}><input list="proveedores-caja" placeholder="Proveedor (opcional)" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} /><datalist id="proveedores-caja">{proveedores.map((proveedor) => <option key={proveedor} value={proveedor} />)}</datalist>{proveedores.length > 0 && <div className={styles.quickOptions}>{proveedores.slice(0, 6).map((proveedor) => <button type="button" key={proveedor} onClick={() => setForm({ ...form, proveedor })}>{proveedor}</button>)}</div>}</div>}
        <input required type="number" min="0.01" step="0.01" placeholder="Importe" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
        <select value={form.medio_pago} onChange={(e) => setForm({ ...form, medio_pago: e.target.value })}><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option></select>
        <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="PENDIENTE">Pendiente</option><option value={form.tipo === "INGRESO" ? "INGRESADO" : "PAGADO"}>{form.tipo === "INGRESO" ? "Ingresado" : "Pagado"}</option></select>
        <label>Fecha<input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></label>
        <label>Vencimiento <small>(opcional)</small><input type="date" value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} /></label>
        <label className={styles.recurrent}><input type="checkbox" checked={form.recurrente} onChange={(e) => setForm({ ...form, recurrente: e.target.checked })} /> Repetir todos los meses</label>
        <button>Registrar movimiento</button>
      </form>
      {mensaje && <p className={styles.message}>{mensaje}</p>}
    </section>

    <section className={styles.card}>
      <h2>Movimientos de {mes}</h2>
      {cargando ? <p>Cargando movimientos...</p> : movimientos.length === 0 ? <p>No hay movimientos para este mes.</p> : <div className={styles.tableWrap}><table><thead><tr><th>Vencimiento</th><th>Tipo</th><th>Categoría / proveedor</th><th>Medio</th><th>Estado</th><th>Importe</th><th /></tr></thead><tbody>{movimientos.map((m) => <tr key={m.id_movimiento}><td>{m.fecha_vencimiento || m.fecha}</td><td className={m.tipo === "INGRESO" ? styles.income : styles.expense}>{m.tipo}</td><td>{m.categoria}{m.proveedor && <><br /><small>Proveedor: {m.proveedor}</small></>}{m.descripcion ? ` — ${m.descripcion}` : ""}{m.origen === "RECURRENTE" && <small className={styles.recurringBadge}>Mensual</small>}</td><td>{m.pagos.length ? m.pagos.map((pago) => `${pago.medio_pago} ${dinero(pago.monto)}`).join(" + ") : m.medio_pago}</td><td><span className={m.estado === "PENDIENTE" ? styles.pending : styles.done}>{m.estado_visible}</span></td><td>{dinero(m.monto)}</td><td className={styles.rowActions}>{m.id_recurrencia && <button className={styles.editButton} onClick={() => setRecurrenteAEditar(m)}>Modificar mensual</button>}{m.estado === "PENDIENTE" && <button className={styles.confirmButton} onClick={() => setMovimientoAPagar(m)}>{m.tipo === "INGRESO" ? "Marcar ingresado" : "Marcar pagado"}</button>}</td></tr>)}</tbody></table></div>}
    </section>
    {movimientoAPagar && <PagoModal movimiento={movimientoAPagar} onClose={() => setMovimientoAPagar(null)} onConfirmar={(pagos) => confirmarMovimiento(movimientoAPagar, pagos)} />}
    {recurrenteAEditar && <MontoRecurrenteModal movimiento={recurrenteAEditar} onClose={() => setRecurrenteAEditar(null)} onGuardar={guardarMontoRecurrente} />}
  </div>;
}
