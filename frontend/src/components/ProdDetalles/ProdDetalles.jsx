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
              <span>Subtotal: ${(v.precio * v.cantidad).toFixed(2)}</span>
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
    </div>
  );
}
