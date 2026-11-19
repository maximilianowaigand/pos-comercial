function sameProduct(item, productId) {
  return String(item.id) === String(productId);
}

// Agrega el artículo al precio promocional hasta alcanzar el cupo disponible;
// las unidades siguientes quedan en otra línea al precio habitual.
export function addItem(venta, prod) {
  if (!prod) return venta;

  const id = prod.id;
  if (id === undefined || id === null) {
    console.error("Producto sin ID:", prod);
    return venta;
  }

  const promoActiva = Boolean(prod.promocion_activa || prod.es_promocion);
  const limiteDisponible = prod.promocion_unidades_restantes == null
    ? Infinity
    : Math.max(0, Number(prod.promocion_unidades_restantes) || 0);
  const promoYaEnCarrito = venta
    .filter((item) => sameProduct(item, id) && item.es_promocion)
    .reduce((total, item) => total + Number(item.cantidad || 0), 0);
  const usarPromo = promoActiva && promoYaEnCarrito < limiteDisponible;
  const lineKey = `${id}:${usarPromo ? "promo" : "habitual"}`;
  const existente = venta.find((item) => item.lineKey === lineKey);

  if (existente) {
    return venta.map((item) => item.lineKey === lineKey
      ? { ...item, cantidad: item.cantidad + 1 }
      : item);
  }

  const precioHabitual = Number(prod.precio_habitual ?? prod.precio) || 0;
  return [...venta, {
    id,
    lineKey,
    nombre: prod.nombre || "Producto",
    precio: usarPromo ? Number(prod.precio_promocional) : (Number(prod.precio) || 0),
    precio_habitual: precioHabitual,
    categoria: prod.categoria || "Sin categoria",
    cantidad: 1,
    es_promocion: usarPromo,
    motivo_promocion: usarPromo ? (prod.promocion_motivo || "Promoción") : null,
    promocion_hasta: prod.promocion_hasta || null,
    promocion_unidades_restantes: prod.promocion_unidades_restantes ?? null,
    promocion_activa: promoActiva,
    precio_promocional: prod.precio_promocional ?? null,
  }];
}

function matchLine(item, lineId) {
  return item.lineKey === lineId || (item.lineKey == null && String(item.id) === String(lineId));
}

export function decreaseItem(venta, lineId) {
  return venta
    .map((item) => matchLine(item, lineId)
      ? { ...item, cantidad: item.cantidad - 1 }
      : item)
    .filter((item) => item.cantidad > 0);
}

export function removeItem(venta, lineId) {
  return venta.filter((item) => !matchLine(item, lineId));
}

export function calcularTotal(venta) {
  return venta.reduce((acc, item) => {
    const precio = Number(item.precio) || 0;
    const cantidad = Number(item.cantidad) || 0;
    return acc + precio * cantidad;
  }, 0);
}
