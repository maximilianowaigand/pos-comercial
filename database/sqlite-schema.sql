-- =====================================
-- 🧾 BASE DE DATOS - POS PANADERÍA
-- Motor: SQLite
-- =====================================

-- =====================================================
-- 🟢 TABLA: productos
-- Almacena los productos disponibles para la venta
-- =====================================================
CREATE TABLE IF NOT EXISTS productos (
  id_producto INTEGER PRIMARY KEY AUTOINCREMENT, -- ID único del producto
  nombre_producto TEXT NOT NULL,                 -- Nombre del producto
  precio_base REAL NOT NULL,                     -- Precio de venta base
  costo_base REAL,                              -- Costo del producto (para cálculo de ganancias)
  categoria TEXT                                -- Categoría (ej: panificados, bebidas, etc.)
);

-- =====================================================
-- 🟢 TABLA: ventas
-- Representa cada operación de venta (cabecera)
-- =====================================================
CREATE TABLE IF NOT EXISTS ventas (
  id_venta INTEGER PRIMARY KEY AUTOINCREMENT, -- ID único de la venta
  fecha TEXT NOT NULL,                        -- Fecha (YYYY-MM-DD)
  hora TEXT NOT NULL,                         -- Hora (HH:MM:SS)
  medio_pago TEXT NOT NULL,                   -- Método de pago (efectivo, tarjeta, etc.)
  total REAL DEFAULT 0,                       -- Total de la venta (calculado automáticamente)
  estado TEXT DEFAULT 'ABIERTA'               -- Estado de la venta (ABIERTA / CERRADA)
);

-- =====================================================
-- 🟢 TABLA: detalle_venta
-- Contiene los productos asociados a cada venta
-- =====================================================
CREATE TABLE IF NOT EXISTS detalle_venta (
  id_detalle INTEGER PRIMARY KEY AUTOINCREMENT, -- ID único del detalle
  id_venta INTEGER NOT NULL,                    -- Relación con la venta
  id_producto INTEGER NOT NULL,                 -- Producto vendido
  cantidad INTEGER NOT NULL,                    -- Cantidad vendida
  precio_unitario REAL,                         -- Precio al momento de la venta
  costo_unitario REAL,                          -- Costo al momento de la venta

  -- Relaciones (integridad referencial)
  FOREIGN KEY (id_venta) REFERENCES ventas(id_venta),
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

-- =====================================================
-- 🟢 TABLA: clima_diario
-- Datos externos para análisis (opcional BI)
-- =====================================================
CREATE TABLE IF NOT EXISTS clima_diario (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- ID único
  fecha TEXT UNIQUE,                   -- Fecha del registro
  temp_min REAL,                       -- Temperatura mínima
  temp_max REAL,                       -- Temperatura máxima
  lluvia_mm REAL,                      -- Milímetros de lluvia
  prob_lluvia INTEGER,                 -- Probabilidad de lluvia (%)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP -- Fecha de creación del registro
);

-- =====================================================
-- ⚡ ÍNDICES
-- Mejoran la performance de consultas frecuentes
-- =====================================================

-- Búsquedas por fecha en ventas
CREATE INDEX IF NOT EXISTS idx_ventas_fecha 
ON ventas(fecha);

-- Relación rápida entre detalle y venta
CREATE INDEX IF NOT EXISTS idx_detalle_venta_id 
ON detalle_venta(id_venta);

-- =====================================================
-- 🔥 TRIGGERS
-- Automatización de lógica de negocio en la base de datos
-- =====================================================

-- -----------------------------------------------------
-- 🔹 Trigger: calcular total automáticamente al insertar
-- -----------------------------------------------------
CREATE TRIGGER IF NOT EXISTS after_insert_detalle
AFTER INSERT ON detalle_venta
FOR EACH ROW
BEGIN
  UPDATE ventas
  SET total = (
    SELECT IFNULL(SUM(cantidad * precio_unitario), 0)
    FROM detalle_venta
    WHERE id_venta = NEW.id_venta
  )
  WHERE id_venta = NEW.id_venta;
END;

-- -----------------------------------------------------
-- 🔹 Trigger: recalcular total al actualizar detalle
-- -----------------------------------------------------
CREATE TRIGGER IF NOT EXISTS after_update_detalle
AFTER UPDATE ON detalle_venta
FOR EACH ROW
BEGIN
  UPDATE ventas
  SET total = (
    SELECT IFNULL(SUM(cantidad * precio_unitario), 0)
    FROM detalle_venta
    WHERE id_venta = NEW.id_venta
  )
  WHERE id_venta = NEW.id_venta;
END;

-- -----------------------------------------------------
-- 🔹 Trigger: recalcular total al eliminar detalle
-- -----------------------------------------------------
CREATE TRIGGER IF NOT EXISTS after_delete_detalle
AFTER DELETE ON detalle_venta
FOR EACH ROW
BEGIN
  UPDATE ventas
  SET total = (
    SELECT IFNULL(SUM(cantidad * precio_unitario), 0)
    FROM detalle_venta
    WHERE id_venta = OLD.id_venta
  )
  WHERE id_venta = OLD.id_venta;
END;