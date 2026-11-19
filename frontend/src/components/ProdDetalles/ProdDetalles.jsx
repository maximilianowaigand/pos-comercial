import { useVentas } from "../../context/VentasContext";
import styles from "./ProdDetalles.module.css";

export default function ProdDetalles() {
  const {
    venta,
    agregar,
    disminuir,
    borrar,
    actualizarPrecio,
  } = useVentas();

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Detalle</h2>

      <ul className={styles.list}>
        {venta.map((v) => (
          <li key={v.lineKey || v.id} className={`${styles.item} ${v.es_promocion ? styles.promoItem : ""}`}>
            <div className={styles.info}>
              <strong>{v.nombre} {v.es_promocion && <span className={styles.promoBadge}>PROMO</span>}</strong>
              {v.es_promocion && <small className={styles.promoReason}>{v.motivo_promocion} · habitual ${Number(v.precio_habitual).toFixed(2)}</small>}
              <div className={styles.priceRow}>
                <span>Precio:</span>
                <input
                  type="number"
                  value={v.precio === 0 ? "" : v.precio}
                  placeholder="Precio"
                  className={styles.priceInput}
                  readOnly={Boolean(v.es_promocion)}
                  title={v.es_promocion ? "El precio promocional se aplica automáticamente" : undefined}
                  onChange={(e) => {
                    const valor = e.target.value;
                    if (valor === "") {
                      actualizarPrecio(v.lineKey || v.id, 0);
                      return;
                    }
                    actualizarPrecio(v.lineKey || v.id, Number(valor));
                  }}
                />
              </div>
              <span>Cantidad: {v.cantidad}</span>
              <span>Subtotal: ${(v.precio * v.cantidad).toFixed(2)}</span>
            </div>

            <div className={styles.actions}>
              <button type="button" onClick={() => disminuir(v.lineKey || v.id)}>
                -
              </button>
              <button type="button" onClick={() => agregar(v)}>
                +
              </button>
              <button type="button" onClick={() => borrar(v.lineKey || v.id)}>
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
