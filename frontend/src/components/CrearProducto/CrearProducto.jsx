import { useState, useEffect } from "react";
import BackButton from "../BackButton/BackButton";
import styles from "./CrearProducto.module.css";

const CATEGORIAS = [
  "Panaderia",
  "Gondola",
  "Lacteos",
  "Bebidas",
  "Otros",
  "Sin Tacc",
];

export default function CrearProducto({
  productos = [],
  productoEditando,
  setProductoEditando,
  onGuardado
}) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  // cargar datos si edita
  useEffect(() => {
    if (productoEditando) {
      setNombre(productoEditando.nombre);
      setPrecio(productoEditando.precio);
      setCosto(productoEditando.costo || "");
      setCategoria(productoEditando.categoria || "");
    }
  }, [productoEditando]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) return setMensaje("El nombre es obligatorio");

    const precioNum = Number(precio);
    const costoNum = Number(costo || 0);

    if (precioNum <= 0) return setMensaje("Precio inválido");
    if (costoNum < 0) return setMensaje("Costo inválido");
    if (!categoria) return setMensaje("Selecciona categoría");

    setLoading(true);

    const url = productoEditando
      ? `/api/productos/${productoEditando.id}`
      : "/api/productos";

    const method = productoEditando ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreLimpio,
          precio: precioNum,
          costo: costoNum,
          categoria
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje(
          productoEditando
            ? "Producto actualizado"
            : "Producto creado"
        );

        setNombre("");
        setPrecio("");
        setCosto("");
        setCategoria("");

        setProductoEditando(null);

        if (onGuardado) onGuardado();
      } else {
        setMensaje(data.error || "Error");
      }
    } catch (err) {
      setMensaje("Error de servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <BackButton />

      <div className={styles.card}>
        <h2 className={styles.title}>
          {productoEditando ? "Editar Producto" : "Crear Producto"}
        </h2>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            type="number"
            placeholder="Precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />

          <input
            type="number"
            placeholder="Costo"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
          />

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Seleccionar categoria</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button disabled={loading}>
            {loading ? "Guardando..." : productoEditando ? "Actualizar" : "Crear"}
          </button>

          {productoEditando && (
            <button
              type="button"
              onClick={() => {
                setProductoEditando(null);
                setNombre("");
                setPrecio("");
                setCosto("");
                setCategoria("");
              }}
            >
              Cancelar
            </button>
          )}
        </form>

        {mensaje && <p>{mensaje}</p>}
      </div>
    </div>
  );
}