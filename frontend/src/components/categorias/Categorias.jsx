import { useEffect, useRef } from "react";
import { useProductos } from "../../context/ProductosContext";
import styles from "./Categorias.module.css";

export default function Categorias({ categorias, categoriaActual, onSelect }) {
  const { busqueda, setBusqueda } = useProductos();
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleRestoreSearchFocus = () => {
      inputRef.current?.focus({ preventScroll: true });
    };

    window.addEventListener("pos:restore-search-focus", handleRestoreSearchFocus);
    window.addEventListener("focus", handleRestoreSearchFocus);
    window.addEventListener("pageshow", handleRestoreSearchFocus);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleRestoreSearchFocus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pos:restore-search-focus", handleRestoreSearchFocus);
      window.removeEventListener("focus", handleRestoreSearchFocus);
      window.removeEventListener("pageshow", handleRestoreSearchFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeydown = (event) => {
      const activeTag = document.activeElement?.tagName;
      const isEditable =
        document.activeElement?.isContentEditable ||
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        activeTag === "SELECT";

      if (isEditable) {
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        inputRef.current?.focus();
        setBusqueda((prev) => prev + event.key);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        inputRef.current?.focus();
        setBusqueda((prev) => prev.slice(0, -1));
      }
    };

    window.addEventListener("keydown", handleGlobalKeydown);
    return () => window.removeEventListener("keydown", handleGlobalKeydown);
  }, [setBusqueda]);

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
        data-keyboard-primary
        ref={inputRef}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar producto..."
        className={styles.buscador}
      />
    </div>
  );
}
