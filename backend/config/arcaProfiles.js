require("./env");

function hasProfileConfig(prefix) {
  return Boolean(
    process.env[`${prefix}_CUIT`] &&
      process.env[`${prefix}_PUNTO_VENTA`] &&
      process.env[`${prefix}_CERT_PATH`] &&
      process.env[`${prefix}_KEY_PATH`]
  );
}

function buildProfile({ id, label, prefix, fallback = false, basePrefix = "ARCA" }) {
  const get = (key) => process.env[`${prefix}_${key}`];
  const getBase = (key) => process.env[`${basePrefix}_${key}`];
  const hasOwnPoint = Boolean(get("PUNTO_VENTA"));
  const useBaseFiscalData = !get("CUIT") && hasOwnPoint;

  return {
    id,
    label,
    available: fallback || hasProfileConfig(prefix) || useBaseFiscalData,
    cuit: fallback || useBaseFiscalData ? getBase("CUIT") : get("CUIT"),
    puntoVenta: fallback ? getBase("PUNTO_VENTA") : get("PUNTO_VENTA"),
    comprobanteTipo: fallback
      ? getBase("COMPROBANTE_TIPO") || "11"
      : get("COMPROBANTE_TIPO") || "11",
    certPath: fallback || useBaseFiscalData ? getBase("CERT_PATH") : get("CERT_PATH"),
    keyPath: fallback || useBaseFiscalData ? getBase("KEY_PATH") : get("KEY_PATH"),
    fiscal: true,
  };
}

function getArcaProfiles() {
  return [
    {
      id: "solo_ventas",
      label: "Solo ventas",
      available: true,
      fiscal: false,
    },
    buildProfile({
      id: "maximiliano",
      label: process.env.ARCA_PROFILE_NAME || "Maximiliano",
      prefix: "ARCA",
      fallback: true,
    }),
    buildProfile({
      id: "yohanna",
      label: process.env.ARCA_SEGUNDO_PROFILE_NAME || "Yohanna",
      prefix: "ARCA_SEGUNDO",
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
