import POSContent from "./POSContent";
import { useVentas } from "../context/VentasContext";
import { useProductos } from "../context/ProductosContext";
import { paymentOptions } from "../utils/paymentOptions";


export default function POS() {
  const {
    venta,
    total,
    totales,
    metodoPago,
    mostrarCliente,
    agregar,
    handleMetodoPagoChange,
    setDatosCliente,
  } = useVentas();

  const { categorias, productosFiltrados, categoria, setCategoria, busqueda } =
    useProductos();

  return (
    <POSContent
      venta={venta}
      total={total}
      totales={totales} 
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
    />
  );
}
