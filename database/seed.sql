-- Datos de ejemplo

INSERT INTO productos (nombre_producto, precio_base, costo_base)
VALUES
('Pan', 100, 60),
('Factura', 80, 50),
('Torta', 500, 300);

INSERT INTO ventas (fecha, hora, medio_pago)
VALUES (CURDATE(), CURTIME(), 'efectivo');

-- Agregar productos a la venta
INSERT INTO detalle_venta (id_venta, id_producto, cantidad)
VALUES (1, 1, 2), (1, 2, 3);
