import styles from "./Products.module.css";

export default function Products({ productos, onAgregar }) {
  return (
    <div className={styles.grid}>
      {productos.map((producto) => (
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
  );
}
