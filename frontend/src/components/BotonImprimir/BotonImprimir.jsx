import { useVentas } from "../../context/VentasContext";
import styles from "./BotonImprimir.module.css";

export default function BotonImprimir() {
  const { venta, total, metodoPago, limpiarVenta, obtenerTotales } =
    useVentas();

  const imprimir = async () => {
    if (venta.length === 0) return;

    const confirmar = window.confirm("¿Confirmar venta e imprimir?");
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
      // ✅ 1. Guardar venta
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        alert("Error guardando venta");
        return;
      }

      // ✅ 2. Obtener respuesta
      const data = await res.json();

      if (!data.id_venta) {
        alert(`Error guardando venta: ${data.error}`);
        return;
      }

      // ✅ 3. Imprimir ticket
      await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: venta,
          total,
          metodoPago,
          id_venta: data.id_venta,
        }),
      });

      // ✅ 4. Limpiar estado
      alert("Venta guardada e impresa");
      limpiarVenta();
      obtenerTotales();

    } catch (error) {
      console.error(error);
      alert("Error en la operación");
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