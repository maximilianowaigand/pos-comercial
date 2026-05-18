import POSContent from "./POSContent";
import { useVentas } from "../context/VentasContext";
import { useProductos } from "../context/ProductosContext";
import { paymentOptions } from "../utils/paymentOptions";


export default function POS() {
  const {
    venta,
    totales,
    metodoPago,
    mostrarCliente,
    facturarVenta,
    agregar,
    handleMetodoPagoChange,
    handleFacturarVentaChange,
    setDatosCliente,
  } = useVentas();

  const { categorias, productosFiltrados, categoria, setCategoria } =
    useProductos();

  return (
    <POSContent
      venta={venta}
      totales={totales} 
      metodoPago={metodoPago}
      mostrarCliente={mostrarCliente}
      facturarVenta={facturarVenta}
      categorias={categorias}
      productosFiltrados={productosFiltrados}
      categoria={categoria}
      paymentOptions={paymentOptions}
      onAgregar={agregar}
      onCategoriaChange={setCategoria}
      onMetodoPagoChange={handleMetodoPagoChange}
      onFacturarVentaChange={handleFacturarVentaChange}
      onDatosClienteChange={setDatosCliente}
    />
  );
}
