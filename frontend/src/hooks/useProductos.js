import { useEffect, useState } from "react";

export function useProductos(categoria) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:4000/productos")
      .then(res => res.json())
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
    ...new Set(productos.map(p => p.categoria))
  ];

  const productosFiltrados =
    categoria === "Todos"
      ? productos
      : productos.filter(p => p.categoria === categoria);

  return { categorias, productosFiltrados, loading };
}