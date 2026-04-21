import { createContext, useContext, useEffect, useState } from "react";

const ProductosContext = createContext();

export function ProductosProvider({ children }) {

  const [productos, setProductos] = useState([]);
  const [categoria, setCategoria] = useState("Todos");
  const [loading, setLoading] = useState(true);


  // 🔄 Cargar productos
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await fetch("/api/productos");
        const data = await res.json();

        setProductos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error cargando productos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  // 🧠 Categorías (SIEMPRE ARRAY)
  const categorias = [
    "Todos",
    ...new Set(productos.map(p => p.categoria || "Sin categoría"))
  ];

  // 🧠 Filtrado seguro
  const productosFiltrados =
    categoria === "Todos"
      ? productos
      : productos.filter(
          p => (p.categoria || "Sin categoría") === categoria
        );

  return (
    <ProductosContext.Provider value={{
      productos,
      setProductos,
      categorias,
      productosFiltrados,
      categoria,
      setCategoria,
      loading
    }}>
      {children}
    </ProductosContext.Provider>
  );
}

export function useProductos() {
  const context = useContext(ProductosContext);
  if (!context) {
    throw new Error("useProductos debe usarse dentro de ProductosProvider");
  }
  return context;
}