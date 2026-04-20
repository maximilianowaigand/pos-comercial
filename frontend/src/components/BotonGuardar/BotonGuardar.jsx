import { useVentas } from "../../context/VentasContext";
import styles from "./BotonGuardar.module.css";

export default function BotonGuardar({ venta, metodoPago }) {
  const { agregarVenta } = useVentas();

  const registrarVenta = async () => {
    if (venta.length === 0) return;

    const confirmar = window.confirm("¿Confirmar venta?");
    if (!confirmar) return;

    const body = {
      items: venta.map((p) => ({
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.precio,
      })),
      metodo_pago: metodoPago,
    };

    try {
      await agregarVenta(body);
      alert("Venta guardada");
    } catch (e) {
      console.error(e);
      alert("Error al guardar venta");
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
