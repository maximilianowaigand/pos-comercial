import { useState } from "react";
import { useVentas } from "../../context/VentasContext";
import { restoreFocusAfterNativeDialog, restoreKeyboardFocus } from "../../utils/keyboardFocus";
import styles from "./BotonGuardar.module.css";

export default function BotonGuardar({ venta, pagos }) {
  const {
    agregarVenta,
    confirmarVentaRepetida,
    descuentoPct,
    datosCliente,
    perfilFacturacion, total, totalPagos, incluirEfectivoFactura,
  } = useVentas();
  const [modal, setModal] = useState(null);

  const handleGuardar = () => {
    if (venta.length === 0) return;
    const pagosVenta = pagos.length === 1
      ? [{ ...pagos[0], monto: total }]
      : pagos.map((pago) => ({ ...pago, monto: Number(pago.monto) }));
    if (pagosVenta.some((pago) => !pago.medio_pago || !(Number(pago.monto) > 0)) || totalPagos !== total) {
      setModal("sinMetodo");
      return;
    }
    setModal("confirmar");
  };

  const handleConfirmar = async () => {
    setModal(null);
    const pagosVenta = pagos.length === 1
      ? [{ ...pagos[0], monto: total }]
      : pagos.map((pago) => ({ ...pago, monto: Number(pago.monto) }));

    const body = {
      items: venta.map((p) => ({
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.precio,
      })),
      pagos: pagosVenta,
      descuento_porcentaje: descuentoPct,
      datosCliente: datosCliente || {},
      incluir_efectivo_factura: incluirEfectivoFactura,
      perfil_facturacion: perfilFacturacion,
    };
    try {
      const confirmarRepetida = await confirmarVentaRepetida(body);
      restoreFocusAfterNativeDialog("[data-keyboard-primary]");
      if (!confirmarRepetida) {
        return;
      }

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
                <p className={styles.modalText}>Seleccioná un método de pago</p>
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
              <p className={styles.modalText}>Venta guardada</p>
            )}

            {modal === "error" && (
              <>
                <p className={styles.modalText}>Error al guardar la venta</p>
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
