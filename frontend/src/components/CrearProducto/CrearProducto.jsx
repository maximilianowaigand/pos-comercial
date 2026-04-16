import { useState } from "react";

const CATEGORIAS = [
  "Panaderia",
  "Gondola",
  "Lacteos",
  "Bebidas",
  "Otros",
  "Sin Tacc"
];

export default function CrearProducto({ productos = [] }) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nombreLimpio = nombre.trim();

    // 🛡️ Validaciones
    if (!nombreLimpio) {
      setMensaje("El nombre es obligatorio");
      return;
    }

    const precioNum = Number(precio);
    const costoNum = Number(costo || 0);

    if (isNaN(precioNum) || precioNum <= 0) {
      setMensaje("El precio debe ser mayor a 0");
      return;
    }

    if (isNaN(costoNum) || costoNum < 0) {
      setMensaje("El costo no puede ser negativo");
      return;
    }

    if (!categoria) {
      setMensaje("Debes seleccionar una categoría");
      return;
    }

    // 🚫 Evitar duplicados
    const existe = productos.find(
      (p) => p.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );

    if (existe) {
      setMensaje("Ese producto ya existe");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("api/productos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: nombreLimpio,
          precio: precioNum,
          costo: costoNum,
          categoria
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje(`✅ Producto creado: ${data.nombre}`);
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
    } finally {
      setLoading(false);
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
          min="1"
          step="0.01"
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <input
          type="number"
          placeholder="Costo"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          min="0"
          step="0.01"
          style={{ width: "100%", marginBottom: "10px" }}
        />

        {/* 📦 SELECT DE CATEGORÍAS */}
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          style={{ width: "100%", marginBottom: "10px" }}
        >
          <option value="">Seleccionar categoría</option>
          {CATEGORIAS.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%" }}
        >
          {loading ? "Guardando..." : "Crear Producto"}
        </button>
      </form>

      {mensaje && <p>{mensaje}</p>}
    </div>
  );
}