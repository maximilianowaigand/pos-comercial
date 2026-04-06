export default function BotonGuardar({ venta, onFinish, metodoPago }) {
  const registrarVenta = async () => {
    if (venta.length === 0) return;

    const confirmar = window.confirm(
  `Total: $${venta.reduce((t, p) => t + p.precio * p.cantidad, 0)}
    ¿Desea confirmar y guardar la venta?`
    );

    // ✨ Solo enviamos id y cantidad, MySQL calculará el total
    const body = {
      items: venta.map(p => ({
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.precio
      })),
      metodo_pago: metodoPago
    };

    console.log("VENTA A ENVIAR:", venta);
    console.log("BODY:", body);

    try {
      const res = await fetch("http://localhost:4000/api/ventas/registrar-venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (data.ventaId) {
        // Aquí usamos el total que devuelve MySQL (trigger)
        alert(`Venta guardada correctamente ✅ ID: ${data.ventaId}, Total: $${data.total}`);
        
      
        if (onFinish) onFinish(); // Ejecutamos callback si hay
      } else {
        alert("Error: " + (data.error || "No se pudo guardar la venta"));
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo conectar al backend.");
    }
  };

  return (
    <button
      onClick={registrarVenta}
      disabled={venta.length === 0}
      style={{
        background: venta.length === 0 ? "#555" : "#0099ff",
        color: "white",
        padding: 5,
        borderRadius: 5,
        marginTop: 10,
        width: "20%"
      }}
    >
      GUARDAR VENTA
    </button>
  );
}