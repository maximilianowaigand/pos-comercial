const METODOS_FACTURACION_AUTOMATICA = new Set(["transferencia", "tarjeta"]);

export function requiereFacturacionAutomatica(metodoPago) {
  return METODOS_FACTURACION_AUTOMATICA.has(
    String(metodoPago || "").trim().toLowerCase()
  );
}

export function esPerfilSoloVentas(perfilFacturacion) {
  return perfilFacturacion === "solo_ventas";
}

export function debeFacturarVenta(metodoPago, facturarVenta, perfilFacturacion) {
  if (esPerfilSoloVentas(perfilFacturacion)) {
    return false;
  }

  return requiereFacturacionAutomatica(metodoPago) || facturarVenta;
}
