import { createContext, useContext, useEffect, useState } from "react";
import { useMemo } from "react";


const ProductosContext = createContext();

export function ProductosProvider({ children }) {

  const [productos, setProductos] = useState([]);
  const [categoria, setCategoria] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");


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

  const normalizar = (str) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();


  const productosFiltrados = useMemo(() => {
  let lista =
    categoria === "Todos"
      ? productos
      : productos.filter(
          p => (p.categoria || "Sin categoría") === categoria
        );

  // 🔍 búsqueda en tiempo real
  if (busqueda.trim().length > 0) {
    const q = normalizar(busqueda);

    lista = lista.filter(p =>
      normalizar(p.nombre).includes(q)
    );
  }

  return lista.slice(0, 50); // ⚡ evita lag
}, [productos, categoria, busqueda]);  

  return (
    <ProductosContext.Provider value={{
      productos,
      setProductos,
      categorias,
      productosFiltrados,
      categoria,
      setCategoria,
      loading,
      busqueda,
      setBusqueda,
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