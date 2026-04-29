import { useVentas } from "../../context/VentasContext";
import styles from "./VentaResumen.module.css";

export default function VentaResumen() {
  const {
    subtotal,
    descuentoPct,
    descuentoMonto,
    total,
    limpiarVenta,
    actualizarDescuentoPct,
  } = useVentas();

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <span>Subtotal</span>
        <strong>${subtotal.toFixed(2)}</strong>
      </div>

      <label className={styles.discountBlock}>
        <span>Descuento %</span>
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={descuentoPct}
          placeholder="0"
          className={styles.input}
          onChange={(e) => actualizarDescuentoPct(e.target.value)}
        />
      </label>

      <div className={styles.row}>
        <span>Descuento</span>
        <strong>-${descuentoMonto.toFixed(2)}</strong>
      </div>

      <div className={`${styles.row} ${styles.totalRow}`}>
        <span>Total</span>
        <strong>${total.toFixed(2)}</strong>
      </div>

      <button type="button" className={styles.clearButton} onClick={limpiarVenta}>
        LIMPIAR
      </button>
    </div>
  );
}
