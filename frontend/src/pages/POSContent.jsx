import { useNavigate } from "react-router-dom";

import ProdDetalles from "../components/ProdDetalles/ProdDetalles";
import OtroProducto from "../components/OtroProducto/OtroProducto";
import BotonGuardar from "../components/BotonGuardar/BotonGuardar";
import BotonImprimir from "../components/BotonImprimir/BotonImprimir";
import BotonExportar from "../components/BotonExportar/BotonExportar";
import FacturacionForm from "../components/FacturacionForm/FacturacionForm";
import Totales from "../components/Totales/Totales";
import { useVentas } from "../context/VentasContext";
import { useProductos } from "../context/ProductosContext";
import styles from "./POS.module.css";

const navigationItems = [
  { label: "POS", path: "/", variant: "primary" },
  { label: "Historial", path: "/historial", variant: "secondary" },
  { label: "+ Crear producto", path: "/crear-producto", variant: "ghost" },
];

const paymentOptions = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
];

export default function POSContent() {
  const navigate = useNavigate();

  const {
    venta,
    total,
    totalesDia,
    totalMes,
    metodoPago,
    mostrarCliente,
    agregar,
    limpiarVenta,
    handleMetodoPagoChange,
    setDatosCliente,
    obtenerTotales,
  } = useVentas();

  const { categorias, productosFiltrados, categoria, setCategoria } =
    useProductos();

  const handleVentaCompleta = () => {
    limpiarVenta();
    obtenerTotales();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>POS Panaderia</h1>
          <p className={styles.subtitle}>
            Ventas, productos y caja en una sola vista.
          </p>
        </div>

        <nav className={styles.navigation}>
          {navigationItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`${styles.navButton} ${styles[item.variant]}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <Totales totalesDia={totalesDia} totalMes={totalMes} />

      <section className={styles.categorySection}>
        <div className={styles.categories}>
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoria(cat)}
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
                onClick={() => agregar(producto)}
              >
                <span className={styles.productName}>{producto.nombre}</span>
                <span className={styles.productPrice}>${producto.precio}</span>
              </button>
            ))}
          </div>

          <div className={styles.extraProduct}>
            <OtroProducto onAdd={agregar} />
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
              onChange={(event) => handleMetodoPagoChange(event.target.value)}
            >
              {paymentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {mostrarCliente && <FacturacionForm onChange={setDatosCliente} />}
          </section>

          <section className={styles.panel}>
            <div className={styles.actionsCard}>
              <BotonGuardar
                venta={venta}
                total={total}
                metodoPago={metodoPago}
                onFinish={handleVentaCompleta}
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
