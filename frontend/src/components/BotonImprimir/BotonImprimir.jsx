import { useVentas } from "../../context/VentasContext";

export default function BotonImprimir({ items = [], metodoPago }) {

  const { agregarVenta } = useVentas();

  const imprimir = async () => {
    if (items.length === 0) return;

    const confirmar = window.confirm("¿Confirmar venta e imprimir?");
    if (!confirmar) return;

    const body = {
      items: items.map(p => ({
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.precio
      })),
      metodo_pago: metodoPago
    };

    try {
      const dataVenta = await agregarVenta(body);

      await fetch("/api/print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items,
          total: dataVenta.total,
          metodoPago
        })
      });

      alert("Venta guardada e impresa ✅");

    } catch (e) {
      console.error(e);
      alert("Error en la operación");
    }
  };

  return (
    <button
      onClick={imprimir}
      disabled={items.length === 0}
      style={{
        background: items.length === 0 ? "#555" : "black",
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