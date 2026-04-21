import { useState } from "react";
import { useProductos } from "../../context/ProductosContext";
import styles from "./ListaProductos.module.css";

const CATEGORIAS = ["Panaderia", "Gondola", "Lacteos", "Bebidas", "Otros", "Sin Tacc"];

const FORM_VACIO = { nombre: "", precio: "", costo: "", categoria: "" };

export default function ListaProductos() {
  const { productos, setProductos } = useProductos();
  const [busqueda, setBusqueda] = useState("");
  const [expandido, setExpandido] = useState(null); // id del producto abierto
  const [form, setForm] = useState(FORM_VACIO);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleEliminar = async (id) => {
  if (!window.confirm("¿Eliminár este producto?")) return;

  try {
    const res = await fetch(`/api/productos/${id}`, { method: "DELETE" });

    if (res.ok) {
      setProductos((prev) => prev.filter((p) => p.id !== id));
      setMensaje("✓ Producto eliminado");
      setTimeout(() => setMensaje(""), 3000);
    } else {
      const data = await res.json();
      setMensaje(data.error || "Error al eliminar");
    }
  } catch {
    setMensaje("Error de servidor");
  }
};

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
      });
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGuardar = async (id) => {
    if (!window.confirm("¿Guardar los cambios?")) return;
    const nombreLimpio = form.nombre.trim();
    if (!nombreLimpio) return setMensaje("El nombre es obligatorio");

    const precioNum = Number(form.precio);
    const costoNum = Number(form.costo || 0);
    if (precioNum <= 0) return setMensaje("Precio inválido");
    if (costoNum < 0) return setMensaje("Costo inválido");
    if (!form.categoria) return setMensaje("Selecciona una categoría");

    setLoading(true);

    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreLimpio,
          precio: precioNum,
          costo: costoNum,
          categoria: form.categoria,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Actualiza el producto en el contexto sin refetch
        setProductos((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, nombre: nombreLimpio, precio: precioNum, costo: costoNum, categoria: form.categoria }
              : p
          )
        );
        setExpandido(null);
        setForm(FORM_VACIO);
        setMensaje("✓ Producto actualizado");
        setTimeout(() => setMensaje(""), 3000);
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
      <input
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
              <span className={styles.precio}>${producto.precio}</span>
              <span className={styles.flecha}>
                {expandido === producto.id ? "▲" : "▼"}
              </span>
            </button>

            {expandido === producto.id && (
              <div className={styles.editorForm}>
                <input
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

                <div className={styles.acciones}>
                  <button
                    className={styles.btnGuardar}
                    onClick={() => handleGuardar(producto.id)}
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    className={styles.btnCancelar}
                    type="button"
                    onClick={() => {
                      setExpandido(null);
                      setForm(FORM_VACIO);
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.nombreBtn}
                    onClick={() => handleExpandir(producto)}
                    >
                    <span>{producto.nombre}</span>
                    <span className={styles.precio}>${producto.precio}</span>
                    <span className={styles.flecha}>
                        {expandido === producto.id ? "▲" : "▼"}
                    </span>
                    </button>

                    <button
                    type="button"
                    className={styles.btnEliminar}
                    onClick={() => handleEliminar(producto.id)}
                    >
                    🗑️
                    </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}