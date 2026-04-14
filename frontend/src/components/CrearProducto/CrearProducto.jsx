import { useState } from "react";

export default function CrearProducto() {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación básica
    if (!nombre || !precio) {
      setMensaje("Nombre y precio son obligatorios");
      return;
    }

    try {
      const res = await fetch("/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          precio: Number(precio),
          costo: Number(costo || 0),
          categoria: categoria || "sin_categoria"
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje(`Producto creado: ${data.nombre} (ID: ${data.id})`);
        setNombre("");
        setPrecio("");
        setCosto("");
        setCategoria("");
      } else {
        setMensaje(data.error || "Error al crear producto");
      }
    } catch (error) {
      console.error(error);
      setMensaje("Error conectando con el backend");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "20px auto" }}>
      <h2>Crear Producto</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{ width: "100%", marginBottom: "10px" }}
        />
        <input
          type="number"
          placeholder="Precio"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          style={{ width: "100%", marginBottom: "10px" }}
        />
        <input
          type="number"
          placeholder="Costo"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          style={{ width: "100%", marginBottom: "10px" }}
        />
        <input
          type="text"
          placeholder="Categoría"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          style={{ width: "100%", marginBottom: "10px" }}
        />
        <button type="submit" style={{ width: "100%" }}>Crear Producto</button>
      </form>
      {mensaje && <p>{mensaje}</p>}
    </div>
  );
}