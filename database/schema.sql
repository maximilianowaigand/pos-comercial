-- Crear base de datos
CREATE DATABASE panaderia;
USE panaderia;

-- Tabla productos
CREATE TABLE productos (
id_producto INT AUTO_INCREMENT PRIMARY KEY,
nombre_producto VARCHAR(100),
precio_base DECIMAL(10,2),
costo_base DECIMAL(10,2)
);

-- Tabla ventas
CREATE TABLE ventas (
id_venta INT AUTO_INCREMENT PRIMARY KEY,
fecha DATE NOT NULL,
hora TIME NOT NULL,
medio_pago VARCHAR(20) NOT NULL,
total DECIMAL(10,2) DEFAULT 0,
estado ENUM('ABIERTA', 'CERRADA') DEFAULT 'ABIERTA'
);

-- Tabla detalle de venta
CREATE TABLE detalle_venta (
id_detalle INT AUTO_INCREMENT PRIMARY KEY,
id_venta INT NOT NULL,
id_producto INT NOT NULL,
cantidad INT NOT NULL,
precio_unitario DECIMAL(10,2),
costo_unitario DECIMAL(10,2),

FOREIGN KEY (id_venta) REFERENCES ventas(id_venta),
FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

-- Tabla clima (para análisis)
CREATE TABLE clima_diario (
id INT AUTO_INCREMENT PRIMARY KEY,
fecha DATE UNIQUE,
temp_min DECIMAL(5,2),
temp_max DECIMAL(5,2),
lluvia_mm DECIMAL(6,2),
prob_lluvia INT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices (mejora performance)
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_detalle_venta_id ON detalle_venta(id_venta);

-- TRIGGERS

DELIMITER //

-- Completa precios automáticamente
CREATE TRIGGER before_insert_detalle
BEFORE INSERT ON detalle_venta
FOR EACH ROW
BEGIN
DECLARE precio_actual DECIMAL(10,2);
DECLARE costo_actual DECIMAL(10,2);

```
SELECT precio_base, costo_base
INTO precio_actual, costo_actual
FROM productos
WHERE id_producto = NEW.id_producto;

IF NEW.precio_unitario IS NULL OR NEW.precio_unitario = 0 THEN
    SET NEW.precio_unitario = precio_actual;
END IF;

SET NEW.costo_unitario = costo_actual;
```

END //

-- Calcula total automáticamente
CREATE TRIGGER after_insert_detalle
AFTER INSERT ON detalle_venta
FOR EACH ROW
BEGIN
UPDATE ventas
SET total = (
SELECT SUM(cantidad * precio_unitario)
FROM detalle_venta
WHERE id_venta = NEW.id_venta
)
WHERE id_venta = NEW.id_venta;
END //

-- Evita agregar productos a ventas cerradas
CREATE TRIGGER before_insert_detalle_check
BEFORE INSERT ON detalle_venta
FOR EACH ROW
BEGIN
DECLARE estado_venta VARCHAR(10);

```
SELECT estado INTO estado_venta
FROM ventas
WHERE id_venta = NEW.id_venta;

IF estado_venta = 'CERRADA' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'No se pueden agregar productos a una venta cerrada';
END IF;
```

END //

-- Evita modificar ventas cerradas
CREATE TRIGGER before_update_detalle_check
BEFORE UPDATE ON detalle_venta
FOR EACH ROW
BEGIN
DECLARE estado_venta VARCHAR(10);

```
SELECT estado INTO estado_venta
FROM ventas
WHERE id_venta = OLD.id_venta;

IF estado_venta = 'CERRADA' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'No se pueden modificar productos de una venta cerrada';
END IF;
```

END //

DELIMITER ;
