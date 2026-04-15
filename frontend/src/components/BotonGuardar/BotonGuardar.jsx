import { useVentas } from "../../context/VentasContext";


export default function BotonGuardar({ venta, metodoPago }) {

  const { agregarVenta } = useVentas();

const registrarVenta = async () => {
  if (venta.length === 0) return;

  const confirmar = window.confirm("¿Confirmar venta?");

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
    await agregarVenta(body); // 🔥 contexto hace todo

    alert("Venta guardada ✅");

  } catch (e) {
    console.error(e);
    alert("Error al guardar venta");
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
