import { useState } from "react";
import styles from "./FacturacionForm.module.css";

export default function FacturacionForm({ onChange }) {
  const [tipoDoc, setTipoDoc] = useState("CF");
  const [numero, setNumero] = useState("");

  function emitChange(nextTipoDoc, nextNumero) {
    const cliente = {
      razon_social: "Consumidor Final",
      condicion_iva: "Consumidor Final",
    };

    if (nextTipoDoc !== "CF" && nextNumero !== "") {
      cliente.tipo_doc = nextTipoDoc;
      cliente.nro_doc = nextNumero;
    }

    onChange(cliente);
  }

  function handleTipoDocChange(e) {
    const value = e.target.value;
    setTipoDoc(value);
    const nextNumero = value === "CF" ? "" : numero;
    setNumero(nextNumero);
    emitChange(value, nextNumero);
  }

  function handleNumeroChange(e) {
    const value = e.target.value.replace(/\D/g, "");
    setNumero(value);
    emitChange(tipoDoc, value);
  }

  return (
    <div className={styles.formCard}>
      <h3 className={styles.title}>Datos para facturar</h3>

      <label className={styles.label}>Documento</label>
      <select
        className={styles.input}
        value={tipoDoc}
        onChange={handleTipoDocChange}
      >
        <option value="CF">Consumidor final (sin documento)</option>
        <option value="DNI">DNI</option>
      </select>

      {tipoDoc !== "CF" && (
        <>
          <label className={styles.label}>DNI</label>
          <input
            type="text"
            inputMode="numeric"
            name="nro_doc"
            value={numero}
            onChange={handleNumeroChange}
            placeholder="DNI del cliente"
            className={styles.input}
          />
        </>
      )}
    </div>
  );
}
