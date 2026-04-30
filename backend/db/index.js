const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dataDir = process.env.APP_DATA_DIR
  ? path.resolve(process.env.APP_DATA_DIR)
  : path.join(__dirname);
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "database.sqlite");
const legacyDbPath = path.join(__dirname, "database.sqlite");

console.log("DB PATH:", dbPath);


const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error conectando a SQLite:", err);
  } else {
    console.log("Conectado a SQLite");
    console.log("Base activa:", dbPath);
  }
});

function bootstrapLegacyDataIfNeeded() {
  if (!process.env.APP_DATA_DIR || dbPath === legacyDbPath || !fs.existsSync(legacyDbPath)) {
    return;
  }

  db.get("SELECT COUNT(*) AS count FROM productos", (productosErr, productosRow) => {
    if (productosErr) {
      console.error("Error verificando productos:", productosErr.message);
      return;
    }

    db.get("SELECT COUNT(*) AS count FROM ventas", (ventasErr, ventasRow) => {
      if (ventasErr) {
        console.error("Error verificando ventas:", ventasErr.message);
        return;
      }

      const productosCount = productosRow?.count ?? 0;
      const ventasCount = ventasRow?.count ?? 0;

      if (productosCount > 0 || ventasCount > 0) {
        return;
      }

      const legacyDb = new sqlite3.Database(legacyDbPath, sqlite3.OPEN_READONLY, (legacyErr) => {
        if (legacyErr) {
          console.error("Error abriendo base legacy:", legacyErr.message);
          return;
        }

        legacyDb.get("SELECT COUNT(*) AS count FROM productos", (legacyProductosErr, legacyProductosRow) => {
          if (legacyProductosErr) {
            console.error("Error leyendo productos legacy:", legacyProductosErr.message);
            legacyDb.close();
            return;
          }

          legacyDb.get("SELECT COUNT(*) AS count FROM ventas", (legacyVentasErr, legacyVentasRow) => {
            if (legacyVentasErr) {
              console.error("Error leyendo ventas legacy:", legacyVentasErr.message);
              legacyDb.close();
              return;
            }

            const legacyProductosCount = legacyProductosRow?.count ?? 0;
            const legacyVentasCount = legacyVentasRow?.count ?? 0;

            if (legacyProductosCount === 0 && legacyVentasCount === 0) {
              legacyDb.close();
              return;
            }

            db.serialize(() => {
              db.run("ATTACH DATABASE ? AS legacy", [legacyDbPath], (attachErr) => {
                if (attachErr) {
                  console.error("Error adjuntando base legacy:", attachErr.message);
                  legacyDb.close();
                  return;
                }

                db.run("BEGIN TRANSACTION");
                db.run("INSERT INTO productos SELECT * FROM legacy.productos");
                db.run(`
                  INSERT INTO ventas (
                    id_venta,
                    fecha,
                    hora,
                    medio_pago,
                    total,
                    estado
                  )
                  SELECT
                    id_venta,
                    fecha,
                    hora,
                    medio_pago,
                    total,
                    estado
                  FROM legacy.ventas
                `);
                db.run("INSERT INTO detalle_venta SELECT * FROM legacy.detalle_venta");
                db.run("INSERT INTO clima_diario SELECT * FROM legacy.clima_diario");
                db.run("COMMIT", (commitErr) => {
                  if (commitErr) {
                    console.error("Error migrando datos legacy:", commitErr.message);
                    db.run("ROLLBACK");
                  } else {
                    console.log("Datos legacy migrados a la base de produccion.");
                  }

                  db.run("DETACH DATABASE legacy", () => {
                    legacyDb.close();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_producto TEXT,
      precio_base REAL,
      costo_base REAL
    )
  `);

  db.run(
    `
      ALTER TABLE productos ADD COLUMN categoria TEXT
    `,
    (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.error("Error agregando categoria:", err.message);
      }
    }
  );

  db.run(`
    CREATE TABLE IF NOT EXISTS ventas (
      id_venta INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      medio_pago TEXT NOT NULL,
      total REAL DEFAULT 0,
      descuento_porcentaje REAL DEFAULT 0,
      descuento_monto REAL DEFAULT 0,
      estado TEXT DEFAULT 'ABIERTA'
    )
  `);

  db.run(
    `
      ALTER TABLE ventas ADD COLUMN descuento_porcentaje REAL DEFAULT 0
    `,
    (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.error("Error agregando descuento_porcentaje:", err.message);
      }
    }
  );

  db.run(
    `
      ALTER TABLE ventas ADD COLUMN descuento_monto REAL DEFAULT 0
    `,
    (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.error("Error agregando descuento_monto:", err.message);
      }
    }
  );

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

  db.run(`CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_detalle_venta_id ON detalle_venta(id_venta)`);

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

bootstrapLegacyDataIfNeeded();

module.exports = db;
