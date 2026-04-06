

const axios = require("axios").default;



exports.emitirFacturaTusFacturas = async (items, total, cliente, metodoPago) => {

    function fechaAppFactura(date = new Date()) {
  const d = new Date(date);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

  try {
    const detalle = items.map(it => ({
      cantidad: it.cantidad.toString(),
      afecta_stock: "N",
      bonificacion_porcentaje: 0,
      incluir_lista_precios_venta: "N",
      leyenda: "",
      producto: {
        descripcion: it.nombre,
        unidad_bulto: "1",
        lista_precios: "Lista API",
        codigo: it.id?.toString() || "000",
        precio_unitario_sin_iva: it.precio.toString(),
        alicuota: "0",
        unidad_medida: 7,
        actualiza_precio: "N",
        rg5329: "N"
        
      },
      
    }));

    const data = {
      usertoken: "d308736c83a1049473968e38576027618138cd154d45ab855038be46f1ff2ab9",
      apikey: "70038",
      apitoken: "5af2d016566bd5ffc0b57911b0da2b25",

      cliente: {
        documento_tipo: cliente.tipo_doc || "DNI",
        documento_nro: cliente.nro_doc,
        razon_social: cliente.razon_social || "Consumidor Final",
        domicilio: cliente.domicilio || "S/D",
        provincia: "8",
        envia_por_mail: "N",
        reclama_deuda: "N",
        envia_por_mail: "N",
        condicion_pago: "210",
        condicion_iva: cliente.condicion_iva || "CF",
        condicion_iva_operacion: cliente.condicion_iva || "CF"
      },

      comprobante: {
        fecha: fechaAppFactura(),
        tipo: "FACTURA C",
        external_reference: Date.now().toString(),
        tags: [],
        datos_informativos: {
          paga_misma_moneda: "N"
        },

        operacion: "V",
        punto_venta: "00003",
        

        moneda: "PES",
        cotizacion: 1,

        periodo_facturado_desde: new Date().toLocaleDateString("es-AR"),
        periodo_facturado_hasta: new Date().toLocaleDateString("es-AR"),
        vencimiento: fechaAppFactura(),
        rubro: "Alimentos",
        rubro_grupo_contable: "Alimentos",

        detalle:detalle,
        afecta_stock: "S",
        bonificacion_porcentaje: 0,
        leyenda:""
      ,
        total: total.toString(),

        pagos: {
          formas_pago: [
            {
              "descripcion":
                metodoPago === "tarjeta"
                  ? "Tarjeta"
                  : "Transferencia Bancaria",
              "importe": total
            }
          ],
          "total": total
        }
      }
    };

    console.log("📤 Enviando factura:", data);

    const res = await axios.post(
      "https://www.tusfacturas.app/app/api/v2/facturacion/nuevo",
      data,
      { headers: { "Content-Type": "application/json" } }
    );

    return res.data;

  } catch (error) {
    console.error("❌ Error al facturar:", error.response?.data || error.message);
    return null;
  }
};
