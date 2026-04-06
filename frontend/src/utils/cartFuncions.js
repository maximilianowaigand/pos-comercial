// Agregar producto al carrito
export function addItem(venta, prod) {
  if (!prod) return venta;

  const productoNormalizado = {
    id: prod.id, // CLAVE
    nombre: prod.nombre || "Producto",
    precio: Number(prod.precio) || 0,
    categoria: prod.categoria || "Sin categoria"
  };

  // Validación fuerte
  if (productoNormalizado.id === undefined) {
    console.error("Producto sin ID:", prod);
    return venta;
  }

  const existe = venta.find(v => v.id === productoNormalizado.id);

  if (existe) {
    return venta.map(v =>
      v.id === productoNormalizado.id
        ? { ...v, cantidad: v.cantidad + 1 }
        : v
    );
  }

  return [...venta, { ...productoNormalizado, cantidad: 1 }];
}

// Disminuir cantidad
export function decreaseItem(venta, id) {
  return venta
    .map(v =>
      v.id === id ? { ...v, cantidad: v.cantidad - 1 } : v
    )
    .filter(v => v.cantidad > 0);
}

// Borrar producto
export function removeItem(venta, id) {
  return venta.filter(v => v.id !== id);
}

// Calcular total
export function calcularTotal(venta) {
  return venta.reduce((acc, item) => {
    const precio = Number(item.precio) || 0;
    const cantidad = Number(item.cantidad) || 0;
    return acc + precio * cantidad;
  }, 0);
}