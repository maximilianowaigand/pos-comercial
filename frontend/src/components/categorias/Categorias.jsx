export default function Categorias({ categorias, categoriaActual, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      {categorias.map(cat => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: categoriaActual === cat ? "orange" : "#333",
            color: "white",
            fontWeight: categoriaActual === cat ? "bold" : "normal"
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
