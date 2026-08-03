import { useVentas } from "../../context/VentasContext";
import { restoreFocusAfterNativeDialog, restoreKeyboardFocus } from "../../utils/keyboardFocus";
import styles from "./BotonImprimir.module.css";
import API from "../../config/api"

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function esperarFactura(idVenta, intentos = 8) {
  let ventaActualizada = null;

  for (let intento = 0; intento < intentos; intento += 1) {
    await sleep(1500);
    const resVenta = await fetch(`${API}/api/ventas/${idVenta}`);

    if (!resVenta.ok) continue;

    ventaActualizada = await resVenta.json();
    const estado = ventaActualizada.facturacion_estado;

    if (estado === "FACTURADA" || estado === "ERROR" || estado === "NO_REQUIERE") {
      return ventaActualizada;
    }
  }

  return ventaActualizada;
}

export default function BotonImprimir() {
  const {
    venta,
    total,
    descuentoPct,
    descuentoMonto,
    pagos,
    datosCliente,
    perfilFacturacion, totalPagos, incluirEfectivoFactura,
    confirmarVentaRepetida,
    limpiarVenta,
    obtenerTotales,
  } =
    useVentas();

  const imprimir = async () => {
    if (venta.length === 0) return;
    const pagosVenta = pagos.length === 1
      ? [{ ...pagos[0], monto: total }]
      : pagos.map((pago) => ({ ...pago, monto: Number(pago.monto) }));
    if (pagosVenta.some((pago) => !pago.medio_pago || !(Number(pago.monto) > 0)) || totalPagos !== total) {
      alert("Seleccioná un método de pago");
      restoreFocusAfterNativeDialog("[data-keyboard-primary]");
      return;
    }

    const confirmar = window.confirm("¿Confirmar venta e imprimir?");
    restoreFocusAfterNativeDialog("[data-keyboard-primary]");
    if (!confirmar) return;

    const body = {
      items: venta.map((p) => ({
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.precio,
      })),
      pagos: pagosVenta,
      descuento_porcentaje: descuentoPct,
      datosCliente: datosCliente || {},
      incluir_efectivo_factura: incluirEfectivoFactura,
      perfil_facturacion: perfilFacturacion,
    };

    try {
      const confirmarRepetida = await confirmarVentaRepetida(body);
      restoreFocusAfterNativeDialog("[data-keyboard-primary]");
      if (!confirmarRepetida) {
        return;
      }

      // 1. Guardar venta
      const res = await fetch(`${API}/api/ventas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        alert("Error guardando venta");
        restoreFocusAfterNativeDialog("[data-keyboard-primary]");
        return;
      }

      // 2. Obtener respuesta
      const data = await res.json();

      if (!data.id_venta) {
        alert(`Error guardando venta: ${data.error}`);
        restoreFocusAfterNativeDialog("[data-keyboard-primary]");
        return;
      }

      // 3. Imprimir ticket
      let ventaParaImprimir = data;

      if (data.facturacion?.queued) {
        ventaParaImprimir = (await esperarFactura(data.id_venta)) || data;
      }

      const resPrint = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: venta,
          total,
          descuentoPorcentaje: descuentoPct,
          descuentoMonto,
          metodoPago: pagosVenta.length === 1 ? pagosVenta[0].medio_pago : "mixto",
          pagos: pagosVenta,
          datosCliente: datosCliente || {},
          id_venta: data.id_venta,
          facturacion: {
            ...data.facturacion,
            estado: ventaParaImprimir.facturacion_estado || data.facturacion?.estado,
          },
        }),
      });
      const printData = await resPrint.json().catch(() => ({}));

      if (!resPrint.ok || printData.ok === false) {
        alert(printData.error || printData.warning || "Error al imprimir");
        restoreFocusAfterNativeDialog("[data-keyboard-primary]");
        return;
      }

      // 4. Limpiar estado
      alert("Venta guardada e impresa");
      limpiarVenta();
      obtenerTotales();
      window.dispatchEvent(new Event("pos:restore-search-focus"));
      restoreFocusAfterNativeDialog("[data-keyboard-primary]");
      restoreKeyboardFocus("[data-keyboard-primary]");

    } catch (error) {
      console.error(error);
      alert("Error en la operación");
      restoreFocusAfterNativeDialog("[data-keyboard-primary]");
    }
  };

  return (
    <button
      type="button"
      onClick={imprimir}
      disabled={venta.length === 0}
      className={`${styles.button} ${
        venta.length === 0 ? styles.disabled : styles.primary
      }`}
    >
      GUARDAR + IMPRIMIR
    </button>
  );
}
