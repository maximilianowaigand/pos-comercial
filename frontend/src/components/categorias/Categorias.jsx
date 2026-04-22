import { useProductos } from "../../context/ProductosContext";
import styles from "./Categorias.module.css";

export default function Categorias({ categorias, categoriaActual, onSelect }) {
  const { busqueda, setBusqueda } = useProductos();

  return (
    <div className={styles.container}>
      {categorias.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() =>{
            onSelect(cat);
            setBusqueda("")
          }}
          
          className={`${styles.button} ${
            categoriaActual === cat ? styles.active : styles.inactive
          }`}
        >
          {cat}
        </button>
      ))}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar producto..."
        className={styles.buscador}
      />
    </div>
  );
}