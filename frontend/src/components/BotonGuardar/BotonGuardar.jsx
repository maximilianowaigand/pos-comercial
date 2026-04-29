import { useVentas } from "../../context/VentasContext";
import { restoreFocusAfterNativeDialog, restoreKeyboardFocus } from "../../utils/keyboardFocus";
import styles from "./BotonGuardar.module.css";

export default function BotonGuardar({ venta, metodoPago }) {
  const { agregarVenta, descuentoPct } = useVentas();

  const registrarVenta = async () => {
    if (venta.length === 0) return;

    const confirmar = window.confirm("¿Confirmar venta?");
    restoreFocusAfterNativeDialog();
    if (!confirmar) return;

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
      alert("Venta guardada");
      restoreFocusAfterNativeDialog();
      restoreKeyboardFocus();
    } catch (e) {
      console.error(e);
      alert("Error al guardar venta");
      restoreFocusAfterNativeDialog();
    }
  };

  return (
    <button
      type="button"
      onClick={registrarVenta}
      disabled={venta.length === 0}
      className={`${styles.button} ${
        venta.length === 0 ? styles.disabled : styles.primary
      }`}
    >
      GUARDAR VENTA
    </button>
  );
}
