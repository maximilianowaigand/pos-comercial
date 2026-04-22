-- =====================================
-- 📊 QUERIES ANALÍTICAS - POS PANADERÍA
-- =====================================
-- Este archivo contiene consultas SQL para análisis de datos,
-- reportes y uso en herramientas de BI (Power BI, etc.)
--
-- No forman parte del flujo operativo del sistema,
-- sino del análisis posterior de ventas.



-- Ventas totales
SELECT SUM(total) AS ingresos_totales
FROM ventas;

-- Ventas por día
SELECT
fecha,
SUM(total) AS total_dia
FROM ventas
GROUP BY fecha
ORDER BY fecha DESC;

-- Productos más vendidos
SELECT
id_producto,
SUM(cantidad) AS total_vendido
FROM detalle_venta
GROUP BY id_producto
ORDER BY total_vendido DESC;

-- Detalle de una venta
SELECT
v.id_venta,
v.fecha,
v.hora,
v.medio_pago,
p.nombre_producto,
dv.cantidad,
dv.precio_unitario,
(dv.cantidad * dv.precio_unitario) AS subtotal
FROM detalle_venta dv
JOIN ventas v ON dv.id_venta = v.id_venta
JOIN productos p ON dv.id_producto = p.id_producto
WHERE v.id_venta = 1;

-- Total por venta
SELECT
v.id_venta,
SUM(dv.cantidad * dv.precio_unitario) AS total_venta
FROM detalle_venta dv
JOIN ventas v ON dv.id_venta = v.id_venta
GROUP BY v.id_venta;

-- Análisis: ventas vs clima (🔥 diferencial)
SELECT
c.fecha,
c.lluvia_mm,
c.temp_max,
c.temp_min,
COALESCE(SUM(v.total),0) AS ventas_totales
FROM clima_diario c
LEFT JOIN ventas v ON v.fecha = c.fecha
GROUP BY
c.fecha,
c.lluvia_mm,
c.temp_max,
c.temp_min
ORDER BY c.fecha DESC;
