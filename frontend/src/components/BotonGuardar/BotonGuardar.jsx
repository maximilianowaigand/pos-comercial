
export default function BotonGuardar({ venta, onFinish, metodoPago }) {

  const registrarVenta = async () => {
  if (venta.length === 0) return;

  const confirmar = window.confirm("¿Confirmar venta?");

  if (!confirmar) {
    console.log("🚫 CANCELADO - NO debería ejecutar fetch");
    return;
  }

  const body = {
    items: venta.map(p => ({
      producto_id: p.id,
      cantidad: p.cantidad,
      precio_unitario: p.precio
    })),
    metodo_pago: metodoPago
  };

  console.log("VENTA:", venta);
  console.log("ITEMS:", body.items);

  try {
    const res = await fetch("/api/ventas/registrar-venta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log("RESPUESTA:", data);

    if (data.ventaId) {
      alert("Venta guardada ✅");
      if (onFinish) onFinish();
    } else {
      alert("Error: " + data.error);
    }

  } catch (e) {
    console.error(e);
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
