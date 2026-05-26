import { useVentas } from "../../context/VentasContext";
import styles from "./FacturacionPerfil.module.css";

export default function FacturacionPerfil() {
  const {
    perfilesFacturacion,
    perfilFacturacion,
    seleccionarPerfilFacturacion,
  } = useVentas();

  const perfilActivo = perfilesFacturacion.find(
    (perfil) => perfil.id === perfilFacturacion
  );

  if (!perfilesFacturacion.length) {
    return null;
  }

  return (
    <>
      <div className={styles.bar}>
        <span>Factura hoy:</span>
        <select
          value={perfilFacturacion}
          onChange={(event) => seleccionarPerfilFacturacion(event.target.value)}
        >
          <option value="">Elegir emisor</option>
          {perfilesFacturacion.map((perfil) => (
            <option
              key={perfil.id}
              value={perfil.id}
              disabled={!perfil.available}
            >
              {perfil.label}
              {perfil.fiscal === false
                ? " - sin facturacion fiscal"
                : perfil.available
                  ? ` - CUIT ${perfil.cuit}`
                  : " - falta configurar"}
            </option>
          ))}
        </select>
      </div>

      {!perfilActivo && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2>Elegir quien factura hoy</h2>
            <p className={styles.helpText}>
              Esta seleccion se pide una vez por dia para evitar facturar con otra persona.
            </p>
            <div className={styles.options}>
              {perfilesFacturacion.map((perfil) => (
                <button
                  key={perfil.id}
                  type="button"
                  disabled={!perfil.available}
                  className={styles.option}
                  onClick={() => seleccionarPerfilFacturacion(perfil.id)}
                >
                  <strong>{perfil.label}</strong>
                  <span>
                    {perfil.fiscal === false
                      ? "Solo registra ventas, no emite factura fiscal"
                      : perfil.available
                      ? `CUIT ${perfil.cuit} - PV ${perfil.puntoVenta}`
                      : "Falta configurar certificado y punto de venta"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
