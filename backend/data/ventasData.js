const pool = require("../db");

async function registrarVenta(data) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { items, metodo_pago } = data;

    if (!items || items.length === 0) {
      throw new Error("No hay productos en la venta");
    }

    // 1️⃣ Insertamos la venta sin total (el trigger lo actualizará después)
    const [ventaResult] = await connection.query(
      "INSERT INTO ventas (fecha, hora, medio_pago, estado) VALUES (CURDATE(), CURTIME(),?,'ABIERTO')",
      [metodo_pago]
    );
    const ventaId = ventaResult.insertId;

    // 2️⃣ Insertamos cada detalle (solo id_venta, id_producto y cantidad)
    for (const item of items) {
      await connection.query(
        "INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
        [ventaId, item.producto_id, item.cantidad, item.precio_unitario || 0]
      );

    }

    // 3️⃣ Cerramos la venta (estado CERRADA) para que se dispare el trigger y calcule el total
    await connection.query(
      "UPDATE ventas SET estado = 'CERRADA' WHERE id_venta = ?",
      [ventaId]
    );


    await connection.commit();

    // 3️⃣ Consultamos el total calculado por el trigger
    const [totalRow] = await connection.query(
      "SELECT total FROM ventas WHERE id_venta = ?",
      [ventaId]
    );
    const total = totalRow[0]?.total ?? 0;
    console.log("TOTAL calculado por trigger:", total);
    return { ventaId, total };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
console.log("VERSIÓN NUEVA DE GET TOTALES CARGADA");

async function getTotales() {
  const [dia] = await pool.query(`
    SELECT 
      medio_pago,
      IFNULL(SUM(total), 0) as totalDia
    FROM ventas
    WHERE DATE(fecha) = CURDATE()
      AND estado = 'CERRADA'
    GROUP BY medio_pago
  `);

  const [mes] = await pool.query(`
    SELECT IFNULL(SUM(total),0) as totalMes
    FROM ventas
    WHERE MONTH(fecha) = MONTH(CURDATE())
    AND YEAR(fecha) = YEAR(CURDATE())
  `);

  let efectivo = 0;
  let transferencia = 0;
  let debito = 0;

  dia.forEach(row => {
    if (row.medio_pago === 'efectivo') efectivo = row.totalDia;
    if (row.medio_pago === 'transferencia') transferencia = row.totalDia;
    if (row.medio_pago === 'tarjeta') debito = row.totalDia;
  });

  const totalDia = efectivo + transferencia + debito;

  return {
    totalDia,
    totalMes: mes[0].totalMes,
    efectivo,
    transferencia,
    debito
  };
}

module.exports = { 
  registrarVenta,
  getTotales
};

