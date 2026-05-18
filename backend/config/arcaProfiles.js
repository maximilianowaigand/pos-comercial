require("./env");

function hasProfileConfig(prefix) {
  return Boolean(
    process.env[`${prefix}_CUIT`] &&
      process.env[`${prefix}_PUNTO_VENTA`] &&
      process.env[`${prefix}_CERT_PATH`] &&
      process.env[`${prefix}_KEY_PATH`]
  );
}

function buildProfile({ id, label, prefix, fallback = false }) {
  const get = (key) => process.env[`${prefix}_${key}`];

  return {
    id,
    label,
    available: fallback || hasProfileConfig(prefix),
    cuit: fallback ? process.env.ARCA_CUIT : get("CUIT"),
    puntoVenta: fallback ? process.env.ARCA_PUNTO_VENTA : get("PUNTO_VENTA"),
    comprobanteTipo: fallback
      ? process.env.ARCA_COMPROBANTE_TIPO || "11"
      : get("COMPROBANTE_TIPO") || "11",
    certPath: fallback ? process.env.ARCA_CERT_PATH : get("CERT_PATH"),
    keyPath: fallback ? process.env.ARCA_KEY_PATH : get("KEY_PATH"),
  };
}

function getArcaProfiles() {
  return [
    buildProfile({
      id: "maximiliano",
      label: process.env.ARCA_PROFILE_NAME || "Maximiliano",
      prefix: "ARCA",
      fallback: true,
    }),
    buildProfile({
      id: "pareja",
      label: process.env.ARCA_PAREJA_PROFILE_NAME || "Pareja",
      prefix: "ARCA_PAREJA",
    }),
  ];
}

function getArcaProfile(profileId) {
  const profiles = getArcaProfiles();
  const profile = profiles.find((item) => item.id === profileId) || profiles[0];

  if (!profile.available) {
    throw new Error(`El perfil de facturacion "${profile.label}" no esta configurado`);
  }

  return profile;
}

module.exports = { getArcaProfiles, getArcaProfile };
