import { useState } from "react";
import styles from "./FacturacionForm.module.css";

export default function FacturacionForm({ onChange }) {
  const [dni, setDni] = useState("");

  function handleChange(e) {
    const value = e.target.value.replace(/\D/g, "");
    setDni(value);

    const cliente = {
      razon_social: "Consumidor Final",
      tipo_doc: "DNI",
      condicion_iva: "Consumidor Final",
    };

    if (value !== "") {
      cliente.nro_doc = value;
    }

    onChange(cliente);
  }

  return (
    <div className={styles.formCard}>
      <h3 className={styles.title}>Datos para Facturar</h3>

      <label className={styles.label}>DNI (opcional)</label>
      <input
        type="text"
        inputMode="numeric"
        name="nro_doc"
        value={dni}
        onChange={handleChange}
        placeholder="Ingresar DNI"
        className={styles.input}
      />

      <small className={styles.placeholder}>
        *Los demas datos se completan automaticamente como Consumidor Final
      </small>
    </div>
  );
}
