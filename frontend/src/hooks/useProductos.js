import { useEffect, useState } from "react";

export function useProductos(categoria) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/productos")
      .then(res => {
        if (!res.ok) throw new Error("Error en la respuesta");
        return res.json();
      })
      .then(data => {
        console.log("Productos desde DB:", data);
        setProductos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error cargando productos:", err);
        setLoading(false);
      });
  }, []);

  const categorias = [
    "Todos",
    ...new Set(productos.map(p => p.categoria || "Sin categoría"))
  ];

  const productosFiltrados =
    categoria === "Todos"
      ? productos
      : productos.filter(
          p => (p.categoria || "Sin categoría") === categoria
        );

  return { categorias, productosFiltrados, loading };
}