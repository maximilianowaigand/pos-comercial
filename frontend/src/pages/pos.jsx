import POSContent from "./POSContent";
import { useVentas } from "../context/VentasContext";
import { useProductos } from "../context/ProductosContext";

const paymentOptions = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
];

export default function POS() {
  const {
    venta,
    total,
    totalesDia,
    totalMes,
    metodoPago,
    mostrarCliente,
    agregar,
    limpiarVenta,
    handleMetodoPagoChange,
    setDatosCliente,
    obtenerTotales,
  } = useVentas();

  const { categorias, productosFiltrados, categoria, setCategoria } =
    useProductos();

  const handleVentaCompleta = () => {
    limpiarVenta();
    obtenerTotales();
  };

  return (
    <POSContent
      venta={venta}
      total={total}
      totalesDia={totalesDia}
      totalMes={totalMes}
      metodoPago={metodoPago}
      mostrarCliente={mostrarCliente}
      categorias={categorias}
      productosFiltrados={productosFiltrados}
      categoria={categoria}
      paymentOptions={paymentOptions}
      onAgregar={agregar}
      onCategoriaChange={setCategoria}
      onMetodoPagoChange={handleMetodoPagoChange}
      onDatosClienteChange={setDatosCliente}
      onVentaCompleta={handleVentaCompleta}
    />
  );
}
