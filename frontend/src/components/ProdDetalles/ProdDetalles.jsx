import { usePOSContext } from "../../context/POSContext";

export default function ProdDetalles() {
  const {
    venta,
    total,
    agregar,
    disminuir,
    borrar,
    limpiarVenta,
    actualizarPrecio
  } = usePOSContext();

  return (
    <div style={{ width: 600, background: "#222", padding: 20, borderRadius: 10, color: "white" }}>
      <h2>Detalle</h2>

      <ul style={{ maxHeight: 500, overflowY: "auto", padding: 0 }}>
        {venta.map(v => (
          <li 
            key={v.id} 
            style={{ 
              display: "flex", 
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              borderBottom: "1px solid #444",
              paddingBottom: 8
            }}
          >
            {/* INFO PRODUCTO */}
            <div>
              <strong>{v.nombre}</strong>
              <br />

              {/* 🔥 PRECIO EDITABLE (AQUÍ ESTÁ LA CLAVE) */}
              Precio: $
                <input
                type="number"
                value={v.precio === 0 ? "" : v.precio}
                placeholder="Precio"
                onChange={(e) => {
                  const valor = e.target.value;

                  // Permite borrar completamente el input
                  if (valor === "") {
                    actualizarPrecio(v.id, 0);
                    return;
                  }

                  actualizarPrecio(v.id, Number(valor));
                }}
                style={{
                  width: 80,
                  marginLeft: 5,
                  marginRight: 10
                }}
              />

              <br />
              Cantidad: {v.cantidad}
              <br />
              Subtotal: ${v.precio * v.cantidad}
            </div>

            {/* BOTONES */}
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => disminuir(v.id)}>–</button>
              <button onClick={() => agregar(v)}>+</button>
              <button onClick={() => borrar(v.id)}>🗑</button>
            </div>
          </li>
        ))}
      </ul>

      <div>
        <h2>Total: ${total}</h2>
        <button onClick={limpiarVenta}>LIMPIAR</button>
      </div>
    </div>
  );
}