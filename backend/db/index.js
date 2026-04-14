const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "./database.sqlite");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error conectando a SQLite:", err);
  } else {
    console.log("✅ Conectado a SQLite");
  }
});

// 🔧 Crear estructura
db.serialize(() => {

  // ======================
  // 🟢 TABLA PRODUCTOS
  // ======================
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_producto TEXT,
      precio_base REAL,
      costo_base REAL
    )
  `);

  // 👉 agregar categoria (seguro)
  db.run(`
    ALTER TABLE productos ADD COLUMN categoria TEXT
  `, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Error agregando categoria:", err.message);
    }
  });

  // ======================
  // 🟢 TABLA VENTAS
  // ======================
  db.run(`
    CREATE TABLE IF NOT EXISTS ventas (
      id_venta INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      medio_pago TEXT NOT NULL,
      total REAL DEFAULT 0,
      estado TEXT DEFAULT 'ABIERTA'
    )
  `);

  // ======================
  // 🟢 TABLA DETALLE VENTA
  // ======================
  db.run(`
    CREATE TABLE IF NOT EXISTS detalle_venta (
      id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
      id_venta INTEGER NOT NULL,
      id_producto INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL,
      costo_unitario REAL,
      FOREIGN KEY (id_venta) REFERENCES ventas(id_venta),
      FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
    )
  `);

  // ======================
  // 🟢 TABLA CLIMA
  // ======================
  db.run(`
    CREATE TABLE IF NOT EXISTS clima_diario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT UNIQUE,
      temp_min REAL,
      temp_max REAL,
      lluvia_mm REAL,
      prob_lluvia INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ======================
  // ⚡ ÍNDICES
  // ======================
  db.run(`CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_detalle_venta_id ON detalle_venta(id_venta)`);

  // ======================
  // 🔥 TRIGGER: calcular total
  // ======================
  db.run(`
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
  `);

});

module.exports = db;