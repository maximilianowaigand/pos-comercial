import { useState } from "react";
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

    if (!nombreLimpio) {
      setMensaje("El nombre es obligatorio");
      return;
    }

    const precioNum = Number(precio);
    const costoNum = Number(costo || 0);

    if (Number.isNaN(precioNum) || precioNum <= 0) {
      setMensaje("El precio debe ser mayor a 0");
      return;
    }

    if (Number.isNaN(costoNum) || costoNum < 0) {
      setMensaje("El costo no puede ser negativo");
      return;
    }

    if (!categoria) {
      setMensaje("Debes seleccionar una categoria");
      return;
    }

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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombreLimpio,
          precio: precioNum,
          costo: costoNum,
          categoria,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje(`Producto creado: ${data.nombre}`);
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
    <div className={styles.wrapper}>
      <BackButton />
      <div className={styles.card}>
        <h2 className={styles.title}>Crear Producto</h2>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            className={styles.input}
            type="number"
            placeholder="Precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            min="1"
            step="0.01"
          />

          <input
            className={styles.input}
            type="number"
            placeholder="Costo"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
            min="0"
            step="0.01"
          />

          <select
            className={styles.input}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Seleccionar categoria</option>
            {CATEGORIAS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Crear Producto"}
          </button>
        </form>

        {mensaje ? <p className={styles.message}>{mensaje}</p> : null}
      </div>
    </div>
  );
}
