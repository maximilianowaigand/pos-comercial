import styles from "../BotonExportar/BotonExportar.module.css"

export default function BotonExportar() {
  const exportar = () => {
    window.open("http://localhost:4000/api/export-excel", "_blank");
  };

  return (
    <button
      onClick={exportar}
      className={styles.button}
    >
      Exportar Ventas a Excel
    </button>
  );
}
