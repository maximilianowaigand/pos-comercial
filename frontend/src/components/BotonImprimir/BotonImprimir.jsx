import { useVentas } from "../../context/VentasContext";
import { restoreFocusAfterNativeDialog, restoreKeyboardFocus } from "../../utils/keyboardFocus";
import styles from "./BotonImprimir.module.css";
import API from "../../config/api"
export default function BotonImprimir() {
  const {
    venta,
    total,
    descuentoPct,
    descuentoMonto,
    metodoPago,
    limpiarVenta,
    obtenerTotales,
  } =
    useVentas();

  const imprimir = async () => {
    if (venta.length === 0) return;

    const confirmar = window.confirm("¿Confirmar venta e imprimir?");
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
      // ✅ 1. Guardar venta
      const res = await fetch(`${API}/api/ventas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        alert("Error guardando venta");
        restoreFocusAfterNativeDialog();
        return;
      }

      // ✅ 2. Obtener respuesta
      const data = await res.json();

      if (!data.id_venta) {
        alert(`Error guardando venta: ${data.error}`);
        restoreFocusAfterNativeDialog();
        return;
      }

      // ✅ 3. Imprimir ticket
      await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: venta,
          total,
          descuentoPorcentaje: descuentoPct,
          descuentoMonto,
          metodoPago,
          id_venta: data.id_venta,
        }),
      });

      // ✅ 4. Limpiar estado
      alert("Venta guardada e impresa");
      restoreFocusAfterNativeDialog();
      limpiarVenta();
      obtenerTotales();
      restoreKeyboardFocus();

    } catch (error) {
      console.error(error);
      alert("Error en la operación");
      restoreFocusAfterNativeDialog();
    }
  };

  return (
    <button
      type="button"
      onClick={imprimir}
      disabled={venta.length === 0}
      className={`${styles.button} ${
        venta.length === 0 ? styles.disabled : styles.primary
      }`}
    >
      GUARDAR + IMPRIMIR
    </button>
  );
}
