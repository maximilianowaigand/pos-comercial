import { useState } from "react";
import styles from "./OtroProducto.module.css";

export default function OtroProducto({ onAdd }) {
  const [nombre, setNombre] = useState("Varios");
  const [precio, setPrecio] = useState("");

  function enviar(e) {
    e.preventDefault();

    const precioNum = Number(precio);
    if (!precioNum || precioNum <= 0) return;

    onAdd({
      id: "otro-" + Date.now(),
      nombre: nombre.trim() || "Varios",
      precio: precioNum
    });

    // reset
    setNombre("Varios");
    setPrecio("");
  }

  return (
    <form onSubmit={enviar} className={styles.form}>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className={styles.input}
      />

      <input
        type="number"
        placeholder="Precio"
        value={precio}
        onChange={(e) => setPrecio(e.target.value)}
        className={styles.input}
      />

      <button type="submit" className={styles.button}>
        Agregar
      </button>
    </form>
  );
}

