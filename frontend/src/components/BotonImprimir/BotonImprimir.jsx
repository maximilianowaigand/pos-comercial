import { useVentas } from "../../context/VentasContext";

export default function BotonImprimir() {
  const {
    venta,
    total,
    metodoPago,
    limpiarVenta,
    obtenerTotales
  } = useVentas();

  const imprimir = async () => {

    console.log("METODO PAGO:", metodoPago);
    
    if (venta.length === 0) return;

    const confirmar = window.confirm("¿Confirmar venta e imprimir?");
    if (!confirmar) return;

    const body = {
      items: venta.map(p => ({
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.precio
      })),
      metodo_pago: metodoPago
      
    };

    try {
      // 1️⃣ Guardar venta en el backend
      const res = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(text);
      alert("Error guardando venta");
      return;
    }

    const data = await res.json();

      if (!data.ventaId) {
        alert("Error guardando venta: " + data.error);
        return;
      }

      // 2️⃣ Imprimir
      await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: venta, total, metodoPago })
      });

      alert("Venta guardada e impresa ✅");

      // 3️⃣ Limpiar y refrescar totales
      limpiarVenta();
      obtenerTotales();

    } catch (e) {
      console.error(e);
      alert("Error en la operación");
    }
  };
  

  return (
    <button
      onClick={imprimir}
      disabled={venta.length === 0}
      style={{
        background: venta.length === 0 ? "#555" : "black",
        color: "white",
        padding: 5,
        borderRadius: 5,
        marginTop: 10,
        width: "20%"
      }}
    >
      GUARDAR + IMPRIMIR
    </button>
  );
}