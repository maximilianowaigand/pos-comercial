import styles from "../BotonExportar/BotonExportar.module.css"

export default function BotonExportar() {
  const exportar = () => {
    window.open("/api/export-excel", "_blank");
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
