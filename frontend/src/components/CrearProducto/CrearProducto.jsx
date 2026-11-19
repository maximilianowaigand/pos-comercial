import { useState, useEffect } from "react";
import BackButton from "../BackButton/BackButton";
import styles from "./CrearProducto.module.css";
import ListaProductos from "../ListaProductos/ListaProductos";
import { restoreKeyboardFocus } from "../../utils/keyboardFocus";
import { useProductos } from "../../context/ProductosContext";
import PromocionFields from "../PromocionFields";


const CATEGORIAS = ["Panaderia", "Gondola", "Lacteos", "Bebidas", "Otros", "Sin Tacc","Cereales","Yerba"];

const FORM_VACIO = {
  nombre: "", precio: "", costo: "", categoria: "",
  precio_promocional: "", promocion_hasta: "", promocion_unidades_limite: "", promocion_motivo: "",
};

export default function CrearProducto() {
  const { setProductos } = useProductos();
  const [form, setForm] = useState(FORM_VACIO);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mensaje) return;
    const timer = setTimeout(() => setMensaje(""), 3000);
    return () => clearTimeout(timer);
  }, [mensaje]);

  const handleChange = (e) => {
  let value = e.target.value;

  if (e.target.name === "nombre") {
    value = value.charAt(0).toUpperCase() + value.slice(1);
  }

  setForm((prev) => ({ ...prev, [e.target.name]: value }));
};;

  const handleSubmit = async (e) => {
  e.preventDefault();

  const nombreLimpio = form.nombre.trim();
  if (!nombreLimpio) return setMensaje("El nombre es obligatorio");

  const precioNum = Number(form.precio);
  const costoNum = Number(form.costo || 0);
  if (precioNum <= 0) return setMensaje("Precio inválido");
  if (form.precio_promocional && (Number(form.precio_promocional) <= 0 || Number(form.precio_promocional) >= precioNum)) return setMensaje("El precio promocional debe ser menor al habitual");
  if (form.promocion_unidades_limite && Number(form.promocion_unidades_limite) < 1) return setMensaje("El límite de unidades debe ser mayor a cero");
  if (form.precio_promocional && !form.promocion_hasta && !form.promocion_unidades_limite) return setMensaje("Definí una fecha de fin o un límite de unidades para la promoción");
  if (costoNum < 0) return setMensaje("Costo inválido");
  if (!form.categoria) return setMensaje("Selecciona una categoría");

  try {
    const check = await fetch(`/api/productos`);
    const productos = await check.json();
    const existe = productos.some(
      (p) => p.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (existe) return setMensaje("Ya existe un producto con ese nombre");
  } catch {
    return setMensaje("Error al verificar productos");
  }

  setLoading(true);

  try {
    const res = await fetch(`/api/productos`, {
      method: "POST",
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
      setMensaje("✓ Producto creado");
      setForm(FORM_VACIO);
      try {
        const listaRes = await fetch(`/api/productos`);
        if (listaRes.ok) setProductos(await listaRes.json());
      } catch { /* La recarga visual puede hacerse al volver a abrir la pantalla. */ }
      restoreKeyboardFocus();
    } else {
      setMensaje(data.error || "Error al guardar");
    }
  } catch {
    setMensaje("Error de servidor");
  } finally {
    setLoading(false);
  }
};

  return (
  <div className={styles.wrapper}>
    <div className={styles.backButton}>
      <BackButton />
    </div>
    <div className={styles.card}>
      <h2 className={styles.title}>Crear Producto</h2>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          data-keyboard-primary
          className={styles.input}
          name="nombre"
          placeholder="Nombre"
          value={form.nombre}
          onChange={handleChange}
        />
        <input
          className={styles.input}
          type="number"
          name="precio"
          placeholder="Precio"
          value={form.precio}
          onChange={handleChange}
        />
        <input
          className={styles.input}
          type="number"
          name="costo"
          placeholder="Costo"
          value={form.costo}
          onChange={handleChange}
        />
        <select
          className={styles.select}
          name="categoria"
          value={form.categoria}
          onChange={handleChange}
        >
          <option value="">Seleccionar categoría</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <PromocionFields form={form} onChange={handleChange} />

        <button className={styles.btn} disabled={loading}>
          {loading ? "Guardando..." : "Crear"}
        </button>
      </form>

      {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
    </div>

    <ListaProductos />
  </div>
);
}
