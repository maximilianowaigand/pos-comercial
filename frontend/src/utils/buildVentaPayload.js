export function buildVentaPayload(venta, metodoPago) {
  return {
    items: venta.map(p => ({
      producto_id: p.id,
      cantidad: p.cantidad,
    })),
    metodo_pago: metodoPago
  };
}