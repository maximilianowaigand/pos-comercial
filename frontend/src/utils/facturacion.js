const METODOS_FACTURACION_AUTOMATICA = new Set(["transferencia", "tarjeta"]);

export function requiereFacturacionAutomatica(metodoPago) {
  return METODOS_FACTURACION_AUTOMATICA.has(
    String(metodoPago || "").trim().toLowerCase()
  );
}
