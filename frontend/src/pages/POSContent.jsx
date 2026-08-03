import ProdDetalles from "../components/ProdDetalles/ProdDetalles";
import BotonGuardar from "../components/BotonGuardar/BotonGuardar";
import BotonImprimir from "../components/BotonImprimir/BotonImprimir";
import BotonExportar from "../components/BotonExportar/BotonExportar";
import FacturacionForm from "../components/FacturacionForm/FacturacionForm";
import Totales from "../components/Totales/Totales";
import VentaResumen from "../components/VentaResumen/VentaResumen";
import Categorias from "../components/categorias/Categorias";
import styles from "./POS.module.css";

export default function POSContent({
  venta,
  totales,
  pagos,
  total,
  totalPagos,
  mostrarCliente,
  incluirEfectivoFactura,
  categorias,
  productosFiltrados,
  categoria,
  paymentOptions,
  onAgregar,
  onCategoriaChange,
  onPagoChange,
  onAgregarPago,
  onEliminarPago,
  onIncluirEfectivoFacturaChange,
  onDatosClienteChange,
}) {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>POS Panaderia</h1>
        <p className={styles.subtitle}>
          Ventas, productos y caja en una sola vista.
        </p>
      </section>

      <Totales totales={totales} />

      <section className={styles.categorySection}>
        <Categorias
              categorias={categorias}
              categoriaActual={categoria}
              onSelect={onCategoriaChange}
            />
      </section>

      <main className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2>Productos</h2>
            <span>{productosFiltrados.length} disponibles</span>
          </div>

          <div className={styles.productsGrid}>
            {productosFiltrados.map((producto) => (
              <button
                key={producto.id}
                type="button"
                className={styles.productButton}
                onClick={() => {
                  onAgregar(producto);
                  window.dispatchEvent(new Event("pos:restore-search-focus"));
                }}
              >
                <span className={styles.productName}>{producto.nombre}</span>
                <span className={styles.productPrice}>${producto.precio}</span>
              </button>
            ))}
            
          </div>

        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2>Detalle de venta</h2>
            <span>{venta.length} items</span>
          </div>
          <ProdDetalles />
        </section>

        <aside className={styles.sidePanel}>
          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <h2>Resumen de venta</h2>
            </div>
            <VentaResumen />
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <h2>Metodo de pago</h2>
            </div>

            <div className={styles.paymentList}>
              {pagos.map((pago, index) => (
                <div className={styles.paymentRow} key={index}>
                  <select className={styles.paymentSelect} value={pago.medio_pago} onChange={(event) => onPagoChange(index, "medio_pago", event.target.value)}>
                    <option value="">Método</option>
                    {paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {pagos.length > 1 && <input className={styles.paymentAmount} type="number" min="0" step="0.01" placeholder="Importe" value={pago.monto} readOnly={index === 0} title={index === 0 ? "Se calcula automáticamente" : ""} onChange={(event) => onPagoChange(index, "monto", event.target.value)} />}
                  {pagos.length > 1 && <button type="button" className={styles.removePayment} onClick={() => onEliminarPago(index)} aria-label="Quitar pago">×</button>}
                </div>
              ))}
            </div>
            <button type="button" className={styles.addPayment} onClick={onAgregarPago} disabled={pagos.length >= 3}>
              {pagos.length === 1 ? "+ Agregar segundo medio" : "+ Agregar tercer medio"}
            </button>
            {pagos.length > 1 && <p className={totalPagos === total ? styles.paymentOk : styles.paymentPending}>Pagado: ${totalPagos.toFixed(2)} de ${total.toFixed(2)}</p>}

            {pagos.some((pago) => pago.medio_pago === "transferencia" || pago.medio_pago === "tarjeta") && (
              <p className={styles.invoiceNotice}>Se factura solo la parte abonada con tarjeta o transferencia</p>
            )}

            {pagos.some((pago) => pago.medio_pago === "efectivo") && (
              <label className={styles.invoiceToggle}>
                <input type="checkbox" checked={incluirEfectivoFactura} onChange={(event) => onIncluirEfectivoFacturaChange(event.target.checked)} />
                Incluir efectivo en la factura
              </label>
            )}

            {mostrarCliente && <FacturacionForm onChange={onDatosClienteChange} />}
          </section>

          <section className={styles.panel}>
            <div className={styles.actionsCard}>
              <BotonGuardar
                venta={venta}
                pagos={pagos}
              />
              <BotonImprimir />
              <BotonExportar />
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
