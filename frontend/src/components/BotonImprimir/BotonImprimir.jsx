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
      }

      // 🔥 SOLO UN REQUEST
      const res = await fetch("http://localhost:4000/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          total,
          metodoPago,
          datosCliente: clienteParaFactura
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        console.error("❌ Error:", text);
        alert("Error imprimiendo/facturando");
        return;
      }

      const data = JSON.parse(text);

      console.log("🧾 Respuesta backend:", data);

      limpiar();
      refresh();

    } catch (err) {
      console.error("❌ Error general:", err);
      alert("Error general en impresión/factura");
    }
  };

  return (
    <button
      style={{ padding: 20, background: "black", color: "white" }}
      onClick={imprimir}
    >
      Facturar + Imprimir
    </button>
  );
}
