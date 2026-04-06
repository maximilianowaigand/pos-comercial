export default function Producto({ producto, onAgregar }) {
  return (
    <button onClick={() => {
  console.log("Producto que se envía:", producto);
  onAgregar(producto);
}}>
  {producto.nombre}
</button>
  );
}
