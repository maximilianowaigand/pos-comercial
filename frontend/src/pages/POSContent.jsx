import ProdDetalles from "../components/ProdDetalles/ProdDetalles";
import OtroProducto from "../components/OtroProducto/OtroProducto";
import BotonGuardar from "../components/BotonGuardar/BotonGuardar";
import BotonImprimir from "../components/BotonImprimir/BotonImprimir";
import BotonExportar from "../components/BotonExportar/BotonExportar";
import FacturacionForm from "../components/FacturacionForm/FacturacionForm";
import Categorias from "../components/categorias/Categorias";
import Totales from "../components/Totales/Totales";
import HistorialVentas from "../components/HistorialVentas/HistorialVentas";
import CrearProducto from "../components/CrearProducto/CrearProducto";
import { useVentas } from "../context/VentasContext";
import { useProductos } from "../context/ProductosContext";

export default function POSContent() {
  const {
    venta,
    total,
    totalesDia,
    totalMes,
    metodoPago,
    mostrarCliente,
    datosCliente,
    agregar,
    disminuir,
    borrar,
    limpiarVenta,
    actualizarPrecio,
    handleMetodoPagoChange,
    setDatosCliente,
    obtenerTotales
  } = useVentas();

  const {
    categorias,
    productosFiltrados,
    categoria,
    setCategoria
  } = useProductos();

  return (
    <div style={{ padding: 20 }}>
      <h1>POS Panadería</h1>

      <Totales totalesDia={totalesDia} totalMes={totalMes} />

      <Categorias
        categorias={categorias}
        categoriaActual={categoria}
        onSelect={setCategoria}
      />

      <div style={{ display: "flex", gap: 10 }}>

        {/* PRODUCTOS */}
        <div style={{ width: 300, display: "grid", gap: 10 }}>
          {productosFiltrados.map(p => (
            <button
              key={p.id}
              onClick={() => agregar(p)}
              style={{ padding: 20 }}
            >
              {p.nombre}
              <br />${p.precio}
            </button>
          ))}
          <OtroProducto onAdd={agregar} />
        </div>

        {/* DETALLE CARRITO */}
        <ProdDetalles />

        {/* MÉTODO DE PAGO */}
        <div>
          <h3>Método de Pago</h3>
          <select
            value={metodoPago}
            onChange={(e) => handleMetodoPagoChange(e.target.value)}
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
          </select>

          {mostrarCliente && (
            <FacturacionForm onChange={setDatosCliente} />
          )}
        </div>

        {/* GUARDAR */}
        <BotonGuardar
          venta={venta}
          total={total}
          metodoPago={metodoPago}
          onFinish={() => {
            limpiarVenta();
            obtenerTotales();
          }}
        />
      </div>

      <BotonImprimir/>
      <BotonExportar />
      <CrearProducto />
      <HistorialVentas />
    </div>
  );
}