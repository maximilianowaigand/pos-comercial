import styles from "./Categorias.module.css";

export default function Categorias({ categorias, categoriaActual, onSelect }) {
  return (
    <div className={styles.container}>
      {categorias.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat)}
          className={`${styles.button} ${
            categoriaActual === cat ? styles.active : styles.inactive
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
