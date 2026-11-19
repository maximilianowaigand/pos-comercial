import styles from "./PromocionFields.module.css";

export default function PromocionFields({ form, onChange }) {
  const promoConfigurada = Boolean(form.precio_promocional);

  return (
    <fieldset className={styles.fieldset}>
      <legend>Promoción (opcional)</legend>
      <label className={styles.field}>
        Precio promocional
        <input
          type="number"
          min="0.01"
          step="0.01"
          name="precio_promocional"
          placeholder="Dejar vacío si no tiene promoción"
          value={form.precio_promocional}
          onChange={onChange}
        />
      </label>

      {promoConfigurada && <>
        <label className={styles.field}>
          Motivo de la promoción
          <select name="promocion_motivo" value={form.promocion_motivo} onChange={onChange}>
            <option value="">Sin especificar</option>
            <option value="Por vencer">Por vencer</option>
            <option value="Compra en promoción">Compra en promoción</option>
            <option value="Otro">Otro</option>
          </select>
        </label>
        <div className={styles.row}>
          <label className={styles.field}>
            Válida hasta (opcional)
            <input type="date" name="promocion_hasta" value={form.promocion_hasta} onChange={onChange} />
          </label>
          <label className={styles.field}>
            Unidades al precio promo (opcional)
            <input type="number" min="1" step="1" name="promocion_unidades_limite" placeholder="Sin límite" value={form.promocion_unidades_limite} onChange={onChange} />
          </label>
        </div>
        <p className={styles.hint}>Completá al menos una condición. La promo termina al llegar la fecha o al vender las unidades indicadas, lo que ocurra primero.</p>
      </>}
    </fieldset>
  );
}
