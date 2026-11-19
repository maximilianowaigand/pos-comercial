import { useState } from "react";
import { useProductos } from "../../context/ProductosContext";
import { restoreKeyboardFocus } from "../../utils/keyboardFocus";
import styles from "./ListaProductos.module.css";
import API from "../../config/api";
import PromocionFields from "../PromocionFields";

const CATEGORIAS = ["Panaderia", "Gondola", "Lacteos", "Bebidas", "Otros", "Sin Tacc","Cereales","Yerba"];
const FORM_VACIO = {
  nombre: "", precio: "", costo: "", categoria: "",
  precio_promocional: "", promocion_hasta: "", promocion_unidades_limite: "", promocion_motivo: "",
};

export default function ListaProductos() {
  const { productosFiltrados, busqueda, setBusqueda, setProductos } = useProductos();
  const [expandido, setExpandido] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [impresionId, setImpresionId] = useState(null);
  const [modal, setModal] = useState(null); // { tipo: "eliminar"|"guardar", id }

  const mostrarMensaje = (msg) => {
    setMensaje(msg);
    setTimeout(() => setMensaje(""), 3000);
  };

  const imprimirCartelPromocion = async (producto) => {
    setImpresionId(producto.id);
    try {
      const res = await fetch(`${API}/api/print-promo/${producto.id}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo imprimir el cartel");
      mostrarMensaje("✓ Cartel enviado a la impresora");
    } catch (error) {
      mostrarMensaje(error.message || "Error al imprimir el cartel");
    } finally {
      setImpresionId(null);
    }
  };

  // ---- ELIMINAR ----
  const handleEliminar = (id) => {
    setModal({ tipo: "eliminar", id });
  };

  const confirmarEliminar = async () => {
    const { id } = modal;
    setModal(null);
    try {
      const res = await fetch(`${API}/api/productos/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProductos((prev) => prev.filter((p) => p.id !== id));
        mostrarMensaje("✓ Producto eliminado");
        restoreKeyboardFocus("[data-keyboard-primary]");
      } else {
        const data = await res.json();
        mostrarMensaje(data.error || "Error al eliminar");
      }
    } catch {
      mostrarMensaje("Error de servidor");
    }
  };

  // ---- GUARDAR ----
  const handleGuardar = (id) => {
    const nombreLimpio = form.nombre.trim();
    if (!nombreLimpio) return mostrarMensaje("El nombre es obligatorio");
    const precioNum = Number(form.precio);
    const costoNum = Number(form.costo || 0);
    if (precioNum <= 0) return mostrarMensaje("Precio inválido");
    if (form.precio_promocional && (Number(form.precio_promocional) <= 0 || Number(form.precio_promocional) >= precioNum)) return mostrarMensaje("El precio promocional debe ser menor al habitual");
    if (form.promocion_unidades_limite && Number(form.promocion_unidades_limite) < 1) return mostrarMensaje("El límite de unidades debe ser mayor a cero");
    if (form.precio_promocional && !form.promocion_hasta && !form.promocion_unidades_limite) return mostrarMensaje("Definí una fecha de fin o un límite de unidades para la promoción");
    if (costoNum < 0) return mostrarMensaje("Costo inválido");
    if (!form.categoria) return mostrarMensaje("Selecciona una categoría");
    setModal({ tipo: "guardar", id });
  };

  const confirmarGuardar = async () => {
    const { id } = modal;
    setModal(null);
    const nombreLimpio = form.nombre.trim();
    const precioNum = Number(form.precio);
    const costoNum = Number(form.costo || 0);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/productos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreLimpio,
          precio: precioNum,
          costo: costoNum,
          categoria: form.categoria,
          precio_promocional: form.precio_promocional || null,
          promocion_hasta: form.promocion_hasta || null,
          promocion_unidades_limite: form.promocion_unidades_limite || null,
          promocion_motivo: form.promocion_motivo || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        try {
          const listaRes = await fetch(`${API}/api/productos`);
          if (listaRes.ok) setProductos(await listaRes.json());
        } catch { /* Se conserva la lista actual si falla solo la recarga. */ }
        setExpandido(null);
        setForm(FORM_VACIO);
        mostrarMensaje("✓ Producto actualizado");
        restoreKeyboardFocus("[data-keyboard-primary]");
      } else {
        mostrarMensaje(data.error || "Error al guardar");
      }
    } catch {
      mostrarMensaje("Error de servidor");
    } finally {
      setLoading(false);
    }
  };

  const cancelarModal = () => {
    setModal(null);
    restoreKeyboardFocus("[data-keyboard-primary]");
  };

  // ---- EXPANDIR ----
  const handleExpandir = (producto) => {
    if (expandido === producto.id) {
      setExpandido(null);
      setForm(FORM_VACIO);
    } else {
      setExpandido(producto.id);
      setForm({
        nombre: producto.nombre,
        precio: producto.precio,
        costo: producto.costo || "",
        categoria: producto.categoria || "",
        precio_promocional: producto.precio_promocional ?? "",
        promocion_hasta: producto.promocion_hasta || "",
        promocion_unidades_limite: producto.promocion_unidades_limite ?? "",
        promocion_motivo: producto.promocion_motivo || "",
      });
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className={styles.wrapper}>
      <input
        data-keyboard-primary
        className={styles.buscador}
        placeholder="Buscar producto..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {mensaje && <p className={styles.mensaje}>{mensaje}</p>}

      <ul className={styles.lista}>
        {productosFiltrados.map((producto) => (
          <li key={producto.id} className={styles.item}>
            <button
              type="button"
              className={styles.nombreBtn}
              onClick={() => handleExpandir(producto)}
            >
              <span>{producto.nombre}</span>
              {producto.promocion_activa ? (
                <span className={styles.priceGroup}>
                  <span className={styles.oldPrice}>${producto.precio}</span>
                  <span className={styles.promoPrice}>${producto.precio_promocional}</span>
                  <span className={styles.promoBadge}>PROMO</span>
                </span>
              ) : <span className={styles.precio}>${producto.precio}</span>}
              <span className={styles.flecha}>
                {expandido === producto.id ? "▲" : "▼"}
              </span>
            </button>

            {producto.promocion_activa && (
              <button
                type="button"
                className={styles.btnCartel}
                onClick={() => imprimirCartelPromocion(producto)}
                disabled={impresionId === producto.id}
              >
                {impresionId === producto.id ? "Enviando a impresora…" : "▤ Imprimir cartel de oferta"}
              </button>
            )}

            {expandido === producto.id && (
              <div className={styles.editorForm}>
                <input className={styles.input} name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} />
                <input className={styles.input} type="number" name="precio" placeholder="Precio" value={form.precio} onChange={handleChange} />
                <input className={styles.input} type="number" name="costo" placeholder="Costo" value={form.costo} onChange={handleChange} />
                <select className={styles.select} name="categoria" value={form.categoria} onChange={handleChange}>
                  <option value="">Seleccionar categoría</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <PromocionFields form={form} onChange={handleChange} />

                <div className={styles.acciones}>
                  <button className={styles.btnGuardar} onClick={() => handleGuardar(producto.id)} disabled={loading}>
                    {loading ? "Guardando..." : "Guardar"}
                  </button>
                  <button className={styles.btnCancelar} type="button" onClick={() => { setExpandido(null); setForm(FORM_VACIO); }}>
                    Cancelar
                  </button>
                  <button type="button" className={styles.btnEliminar} onClick={() => handleEliminar(producto.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* MODAL */}
      {modal && (
        <div className={styles.overlay}>
          <div className={styles.modalBox}>
            <p className={styles.modalText}>
              {modal.tipo === "eliminar" ? "¿Eliminar este producto?" : "¿Guardar los cambios?"}
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnGuardar} onClick={modal.tipo === "eliminar" ? confirmarEliminar : confirmarGuardar}>
                Confirmar
              </button>
              <button className={styles.btnCancelar} onClick={cancelarModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
