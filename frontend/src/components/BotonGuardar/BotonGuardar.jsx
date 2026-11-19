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
    perfilFacturacion, total, totalBase, totalPagos, incluirEfectivoFactura, recargoCreditoPct,
  } = useVentas();
  const [modal, setModal] = useState(null);
  const [errorMensaje, setErrorMensaje] = useState("");

  const handleGuardar = () => {
    if (venta.length === 0) return;
    const pagosVenta = (pagos.length === 1 ? [{ ...pagos[0], monto: totalBase }] : pagos).map((pago) => ({ ...pago, monto: Number((Number(pago.monto) * (pago.medio_pago === "tarjeta_credito" ? 1 + recargoCreditoPct / 100 : 1)).toFixed(2)) }));
    if (pagosVenta.some((pago) => !pago.medio_pago || !(Number(pago.monto) > 0)) || totalPagos !== total) {
      setModal("sinMetodo");
      return;
    }
    setModal("confirmar");
  };

  const handleConfirmar = async () => {
    setModal(null);
    const pagosVenta = (pagos.length === 1 ? [{ ...pagos[0], monto: totalBase }] : pagos).map((pago) => ({ ...pago, monto: Number((Number(pago.monto) * (pago.medio_pago === "tarjeta_credito" ? 1 + recargoCreditoPct / 100 : 1)).toFixed(2)) }));

    const body = {
      items: venta.map((p) => ({
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.precio,
        es_promocion: Boolean(p.es_promocion),
        motivo_promocion: p.motivo_promocion || null,
      })),
      pagos: pagosVenta,
      descuento_porcentaje: descuentoPct,
      recargo_credito_porcentaje: recargoCreditoPct,
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
      setErrorMensaje(e.message || "No se pudo guardar la venta");
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
                <p className={styles.modalText}>{errorMensaje || "Error al guardar la venta"}</p>
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
