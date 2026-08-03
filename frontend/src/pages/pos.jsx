import POSContent from "./POSContent";
import { useVentas } from "../context/VentasContext";
import { useProductos } from "../context/ProductosContext";
import { paymentOptions } from "../utils/paymentOptions";


export default function POS() {
  const {
    venta,
    totales,
    pagos,
    total,
    totalPagos,
    mostrarCliente,
    incluirEfectivoFactura,
    agregar,
    actualizarPago,
    agregarPago,
    eliminarPago,
    actualizarIncluirEfectivoFactura,
    setDatosCliente,
  } = useVentas();

  const { categorias, productosFiltrados, categoria, setCategoria } =
    useProductos();

  return (
    <POSContent
      venta={venta}
      totales={totales} 
      pagos={pagos}
      total={total}
      totalPagos={totalPagos}
      mostrarCliente={mostrarCliente}
      incluirEfectivoFactura={incluirEfectivoFactura}
      categorias={categorias}
      productosFiltrados={productosFiltrados}
      categoria={categoria}
      paymentOptions={paymentOptions}
      onAgregar={agregar}
      onCategoriaChange={setCategoria}
      onPagoChange={actualizarPago}
      onAgregarPago={agregarPago}
      onEliminarPago={eliminarPago}
      onIncluirEfectivoFacturaChange={actualizarIncluirEfectivoFactura}
      onDatosClienteChange={setDatosCliente}
    />
  );
}
