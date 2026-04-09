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
    <div style={{ padding: 20, marginTop: 20, border: "1px solid #ccc" }}>
      <h3>Datos para Facturar</h3>

      <label>DNI (opcional)</label>
      <input
        type="text"
        inputMode="numeric"
        name="nro_doc"
        value={dni}
        onChange={handleChange}
        placeholder="Ingresar DNI"
        style={{ width: "50%", padding: 8 }}
      />

      <small className={styles.placeholder}>
        *Los demás datos se completan automáticamente como Consumidor Final
      </small>
    </div>
  );
}
