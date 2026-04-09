export default function BotonImprimir({
  items,
  total,
  metodoPago,
  datosCliente,
  limpiar,
  refresh
}) {

const imprimir = async () => {
  try {
    const clienteParaFactura = {
      razon_social: "Consumidor Final",
      tipo_doc: "DNI",
      condicion_iva: "Consumidor Final",
      ...(datosCliente?.nro_doc && { nro_doc: datosCliente.nro_doc })
    };

    // 🥇 1. GUARDAR VENTA
    const resVenta = await fetch("/api/ventas/registrar-venta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      items: items.map(p => ({
      producto_id: p.id,
      cantidad: p.cantidad,
      precio_unitario: p.precio
  })),
  metodo_pago: metodoPago
}),
    });

    const dataVenta = await resVenta.json();

    if (!dataVenta.ventaId) {
      alert("Error guardando la venta");
      return;
    }

    // 🥈 2. IMPRIMIR
    const resPrint = await fetch("http://localhost:3000/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        total: dataVenta.total, // 💥 usar total REAL
        metodoPago,
        datosCliente: clienteParaFactura
      }),
    });

    if (!resPrint.ok) {
      alert("Error imprimiendo");
      return;
    }

    // 🥉 3. ACTUALIZAR UI
    limpiar();
    refresh(); // 💥 esto ya lo tenías bien

  } catch (err) {
    console.error(err);
    alert("Error general");
  }
};

  return (
    <button
      style={{ padding: 20, background: "black", color: "white" }}
      onClick={imprimir}
    >
      Gardar + Imprimir
    </button>
  );
}
