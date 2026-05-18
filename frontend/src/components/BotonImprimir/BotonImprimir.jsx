import { useVentas } from "../../context/VentasContext";
import { restoreFocusAfterNativeDialog, restoreKeyboardFocus } from "../../utils/keyboardFocus";
import { requiereFacturacionAutomatica } from "../../utils/facturacion";
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
    metodoPago,
    datosCliente,
    facturarVenta,
    perfilFacturacion,
    confirmarVentaRepetida,
    limpiarVenta,
    obtenerTotales,
  } =
    useVentas();

  const imprimir = async () => {
    if (venta.length === 0) return;

    const confirmar = window.confirm("¿Confirmar venta e imprimir?");
    restoreFocusAfterNativeDialog();
    if (!confirmar) return;

    const body = {
      items: venta.map((p) => ({
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.precio,
      })),
      metodo_pago: metodoPago,
      descuento_porcentaje: descuentoPct,
      datosCliente: datosCliente || {},
      facturar_venta: requiereFacturacionAutomatica(metodoPago) || facturarVenta,
      perfil_facturacion: perfilFacturacion,
    };

    try {
      const confirmarRepetida = await confirmarVentaRepetida(body);
      restoreFocusAfterNativeDialog();
      if (!confirmarRepetida) {
        return;
      }

      console.log("[VENTA + IMPRESION] Enviando venta al backend:", body);
      // ✅ 1. Guardar venta
      const res = await fetch(`${API}/api/ventas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        alert("Error guardando venta");
        restoreFocusAfterNativeDialog();
        return;
      }

      // ✅ 2. Obtener respuesta
      const data = await res.json();

      if (!data.id_venta) {
        alert(`Error guardando venta: ${data.error}`);
        restoreFocusAfterNativeDialog();
        return;
      }

      // ✅ 3. Imprimir ticket
      let ventaParaImprimir = data;

      if (data.facturacion?.queued) {
        ventaParaImprimir = (await esperarFactura(data.id_venta)) || data;
      }

      await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: venta,
          total,
          descuentoPorcentaje: descuentoPct,
          descuentoMonto,
          metodoPago,
          datosCliente: datosCliente || {},
          id_venta: data.id_venta,
          facturacion: {
            ...data.facturacion,
            estado: ventaParaImprimir.facturacion_estado || data.facturacion?.estado,
          },
        }),
      });

      // ✅ 4. Limpiar estado
      alert("Venta guardada e impresa");
      restoreFocusAfterNativeDialog();
      limpiarVenta();
      obtenerTotales();
      restoreKeyboardFocus();

    } catch (error) {
      console.error(error);
      alert("Error en la operación");
      restoreFocusAfterNativeDialog();
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
