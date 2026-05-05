import { useState } from "react";
import { useVentas } from "../../context/VentasContext";
import { restoreKeyboardFocus } from "../../utils/keyboardFocus";
import styles from "./BotonGuardar.module.css";

export default function BotonGuardar({ venta, metodoPago }) {
  const { agregarVenta, descuentoPct } = useVentas();
  const [modal, setModal] = useState(null);

  const handleGuardar = () => {
    if (venta.length === 0) return;
    if (!metodoPago) {
      setModal("sinMetodo");
      return;
    }
    setModal("confirmar");
  };

  const handleConfirmar = async () => {
    setModal(null);

    const body = {
      items: venta.map((p) => ({
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.precio,
      })),
      metodo_pago: metodoPago,
      descuento_porcentaje: descuentoPct,
    };

    try {
      await agregarVenta(body);
      setModal("exito");
      setTimeout(() => {
        setModal(null);
        restoreKeyboardFocus("[data-keyboard-primary]");
      }, 1200);
    } catch (e) {
      console.error(e);
      setModal("error");
    }
  };

  const handleCancelar = () => {
    setModal(null);
    restoreKeyboardFocus("[data-keyboard-primary]");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGuardar}
        disabled={venta.length === 0}
        className={`${styles.button} ${
          venta.length === 0 ? styles.disabled : styles.primary
        }`}
      >
        GUARDAR VENTA
      </button>

      {modal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>

            {modal === "sinMetodo" && (
              <>
                <p className={styles.modalText}>⚠️ Seleccioná un método de pago</p>
                <button
                  type="button"
                  className={`${styles.button} ${styles.secondary}`}
                  onClick={handleCancelar}
                >
                  Cerrar
                </button>
              </>
            )}

            {modal === "confirmar" && (
              <>
                <p className={styles.modalText}>¿Confirmar venta?</p>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.primary}`}
                    onClick={handleConfirmar}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.secondary}`}
                    onClick={handleCancelar}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {modal === "exito" && (
              <p className={styles.modalText}>✅ Venta guardada</p>
            )}

            {modal === "error" && (
              <>
                <p className={styles.modalText}>❌ Error al guardar la venta</p>
                <button
                  type="button"
                  className={`${styles.button} ${styles.secondary}`}
                  onClick={handleCancelar}
                >
                  Cerrar
                </button>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}