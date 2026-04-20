import { useVentas } from "../../context/VentasContext";
import styles from "./ProdDetalles.module.css";

export default function ProdDetalles() {
  const {
    venta,
    total,
    agregar,
    disminuir,
    borrar,
    limpiarVenta,
    actualizarPrecio,
  } = useVentas();

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Detalle</h2>

      <ul className={styles.list}>
        {venta.map((v) => (
          <li key={v.id} className={styles.item}>
            <div className={styles.info}>
              <strong>{v.nombre}</strong>
              <div className={styles.priceRow}>
                <span>Precio:</span>
                <input
                  type="number"
                  value={v.precio === 0 ? "" : v.precio}
                  placeholder="Precio"
                  className={styles.priceInput}
                  onChange={(e) => {
                    const valor = e.target.value;
                    if (valor === "") {
                      actualizarPrecio(v.id, 0);
                      return;
                    }
                    actualizarPrecio(v.id, Number(valor));
                  }}
                />
              </div>
              <span>Cantidad: {v.cantidad}</span>
              <span>Subtotal: ${v.precio * v.cantidad}</span>
            </div>

            <div className={styles.actions}>
              <button type="button" onClick={() => disminuir(v.id)}>
                -
              </button>
              <button type="button" onClick={() => agregar(v)}>
                +
              </button>
              <button type="button" onClick={() => borrar(v.id)}>
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <h2>Total: ${total}</h2>
        <button type="button" className={styles.clearButton} onClick={limpiarVenta}>
          LIMPIAR
        </button>
      </div>
    </div>
  );
}
