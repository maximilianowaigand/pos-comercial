import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../config/api";
import styles from "./AlertasContext.module.css";

const AlertasContext = createContext();

export function AlertasProvider({ children }) {
  const [alertas, setAlertas] = useState([]);
  const [ocupado, setOcupado] = useState(false);
  const navigate = useNavigate();

  const recargarAlertas = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/movimientos/alertas`);
      const data = await res.json();
      if (res.ok) setAlertas(data.alertas || []);
    } catch (error) {
      console.error("No se pudieron cargar alertas:", error);
    }
  }, []);

  useEffect(() => { recargarAlertas(); }, [recargarAlertas]);

  const cerrarAlerta = () => setAlertas((actuales) => actuales.slice(1));
  const mostrarAlerta = (alerta) => setAlertas((actuales) => [...actuales, { id: crypto.randomUUID(), ...alerta }]);

  const ejecutarAccion = async (alerta) => {
    if (alerta.accion?.tipo === "IR_A_CAJA") {
      navigate("/caja");
      cerrarAlerta();
      return;
    }
    if (alerta.accion?.tipo === "CERRAR_BALANCE") {
      try {
        setOcupado(true);
        const res = await fetch(`${API}/api/movimientos/cerrar-balance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mes: alerta.accion.mes }),
        });
        if (!res.ok) throw new Error("No se pudo cerrar el balance");
        cerrarAlerta();
        await recargarAlertas();
        navigate("/caja");
      } catch (error) {
        console.error(error);
      } finally {
        setOcupado(false);
      }
    }
  };

  const alerta = alertas[0];
  return <AlertasContext.Provider value={{ mostrarAlerta, recargarAlertas }}>
    {children}
    {alerta && <div className={styles.overlay} role="alertdialog" aria-modal="true">
      <section className={styles.dialog}>
        <span className={styles.tag}>{alerta.tipo === "VENCIMIENTO" ? "Vencimiento" : "Cierre mensual"}</span>
        <h2>{alerta.titulo}</h2>
        <p>{alerta.mensaje}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={cerrarAlerta}>Más tarde</button>
          <button type="button" disabled={ocupado} onClick={() => ejecutarAccion(alerta)}>
            {alerta.accion?.tipo === "CERRAR_BALANCE" ? "Cerrar balance" : "Ir a Caja"}
          </button>
        </div>
      </section>
    </div>}
  </AlertasContext.Provider>;
}

export function useAlertas() {
  const context = useContext(AlertasContext);
  if (!context) throw new Error("useAlertas debe usarse dentro de AlertasProvider");
  return context;
}
