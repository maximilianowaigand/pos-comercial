import ProdDetalles from "../components/ProdDetalles/ProdDetalles";
import OtroProducto from "../components/OtroProducto/OtroProducto";
import BotonGuardar from "../components/BotonGuardar/BotonGuardar";
import BotonImprimir from "../components/BotonImprimir/BotonImprimir";
import BotonExportar from "../components/BotonExportar/BotonExportar";
import FacturacionForm from "../components/FacturacionForm/FacturacionForm";
import Totales from "../components/Totales/Totales";
import styles from "./POS.module.css";

export default function POSContent({
  venta,
  total,
  totalesDia,
  totalMes,
  metodoPago,
  mostrarCliente,
  categorias,
  productosFiltrados,
  categoria,
  paymentOptions,
  onAgregar,
  onCategoriaChange,
  onMetodoPagoChange,
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

      <Totales totalesDia={totalesDia} totalMes={totalMes} />

      <section className={styles.categorySection}>
        <div className={styles.categories}>
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoriaChange(cat)}
              className={`${styles.categoryButton} ${
                categoria === cat ? styles.categoryActive : styles.categoryInactive
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
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
                onClick={() => onAgregar(producto)}
              >
                <span className={styles.productName}>{producto.nombre}</span>
                <span className={styles.productPrice}>${producto.precio}</span>
              </button>
            ))}
          </div>

          <div className={styles.extraProduct}>
            <OtroProducto onAdd={onAgregar} />
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
              <h2>Metodo de pago</h2>
            </div>

            <select
              className={styles.paymentSelect}
              value={metodoPago}
              onChange={(event) => onMetodoPagoChange(event.target.value)}
            >
              {paymentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {mostrarCliente && <FacturacionForm onChange={onDatosClienteChange} />}
          </section>

          <section className={styles.panel}>
            <div className={styles.actionsCard}>
              <BotonGuardar
                venta={venta}
                metodoPago={metodoPago}
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
