const axios = require("axios");
const pool = require("../db");

// Coordenadas zona céntrica comercial (ajustá si querés)
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

async function guardarClima() {
  const connection = await pool.getConnection();

  try {
    const data = await obtenerForecast();

    await connection.beginTransaction();

    for (let i = 0; i < data.time.length; i++) {
      await connection.query(
        `
        INSERT INTO clima_diario 
        (fecha, temp_min, temp_max, lluvia_mm, prob_lluvia)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          temp_min = VALUES(temp_min),
          temp_max = VALUES(temp_max),
          lluvia_mm = VALUES(lluvia_mm),
          prob_lluvia = VALUES(prob_lluvia)
        `,
        [
          data.time[i],
          data.temperature_2m_min[i],
          data.temperature_2m_max[i],
          data.precipitation_sum[i],
          data.precipitation_probability_max[i]
        ]
      );
    }

    await connection.commit();

    console.log("Clima guardado correctamente");
    return { ok: true };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { guardarClima };