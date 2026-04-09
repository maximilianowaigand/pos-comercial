const axios = require("axios");
const db = require("../db");

// Coordenadas
const LAT = -31.73197;
const LON = -60.5238;

async function obtenerForecast() {
  try {
    const response = await axios.get(
      "https://api.open-meteo.com/v1/forecast",
      {
        params: {
          latitude: LAT,
          longitude: LON,
          daily: [
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "precipitation_probability_max"
          ].join(","),
          timezone: "America/Argentina/Buenos_Aires",
          forecast_days: 5
        }
      }
    );

    return response.data.daily;
  } catch (error) {
    console.error("Error obteniendo clima:", error.message);
    throw error;
  }
}

function guardarClima() {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await obtenerForecast();

      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        const stmt = db.prepare(`
          INSERT INTO clima_diario 
          (fecha, temp_min, temp_max, lluvia_mm, prob_lluvia)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(fecha) DO UPDATE SET
            temp_min = excluded.temp_min,
            temp_max = excluded.temp_max,
            lluvia_mm = excluded.lluvia_mm,
            prob_lluvia = excluded.prob_lluvia
        `);

        for (let i = 0; i < data.time.length; i++) {
          stmt.run([
            data.time[i],
            data.temperature_2m_min[i],
            data.temperature_2m_max[i],
            data.precipitation_sum[i],
            data.precipitation_probability_max[i]
          ]);
        }

        stmt.finalize();

        db.run("COMMIT", (err) => {
          if (err) return reject(err);

          console.log("Clima guardado correctamente");
          resolve({ ok: true });
        });
      });

    } catch (error) {
      db.run("ROLLBACK");
      reject(error);
    }
  });
}

module.exports = { guardarClima };