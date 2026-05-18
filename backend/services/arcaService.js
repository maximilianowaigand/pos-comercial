const axios = require("axios").default;
const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

require("../config/env");
const { getArcaProfile } = require("../config/arcaProfiles");

const WSAA_URLS = {
  production: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
  testing: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
};

const WSFE_URLS = {
  production: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
  testing: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
};

const cachedTickets = new Map();

const arcaHttpsAgent = new https.Agent({
  ciphers: "DEFAULT@SECLEVEL=1",
});

function getArcaConfig(profileId) {
  const env = process.env.ARCA_ENV === "testing" ? "testing" : "production";
  const profile = getArcaProfile(profileId);
  const config = {
    env,
    profileId: profile.id,
    profileLabel: profile.label,
    cuit: profile.cuit,
    puntoVenta: Number(profile.puntoVenta),
    comprobanteTipo: Number(profile.comprobanteTipo || 11),
    certPath: profile.certPath,
    keyPath: profile.keyPath,
    wsaaUrl: WSAA_URLS[env],
    wsfeUrl: WSFE_URLS[env],
    opensslPath:
      process.env.OPENSSL_PATH ||
      "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
  };

  const missing = Object.entries({
    ARCA_CUIT: config.cuit,
    ARCA_PUNTO_VENTA: config.puntoVenta,
    ARCA_CERT_PATH: config.certPath,
    ARCA_KEY_PATH: config.keyPath,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Faltan variables ARCA en .env: ${missing.join(", ")}`);
  }

  if (!fs.existsSync(config.certPath)) {
    throw new Error(`No existe ARCA_CERT_PATH: ${config.certPath}`);
  }

  if (!fs.existsSync(config.keyPath)) {
    throw new Error(`No existe ARCA_KEY_PATH: ${config.keyPath}`);
  }

  if (!fs.existsSync(config.opensslPath)) {
    throw new Error(`No existe OpenSSL en: ${config.opensslPath}`);
  }

  return config;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractTag(xml, tag) {
  const match = String(xml).match(new RegExp(`<(?:\\w+:)?${tag}>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`));
  return match ? match[1].trim() : null;
}

function extractSection(xml, tag) {
  return extractTag(xml, tag) || "";
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function formatArcaDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatAmount(value) {
  return Number(value || 0).toFixed(2);
}

function getDocumentoConsumidorFinal(cliente = {}) {
  const numero = String(cliente.nro_doc || "").replace(/\D/g, "");
  const tipoDoc = String(cliente.tipo_doc || "").toUpperCase();

  if (numero && ["CUIT", "CUIL"].includes(tipoDoc)) {
    return {
      docTipo: 80,
      docNro: numero,
    };
  }

  if (numero) {
    return {
      docTipo: 96,
      docNro: numero,
    };
  }

  return {
    docTipo: 99,
    docNro: "0",
  };
}

function buildLoginTicketRequest(service = "wsfe") {
  const uniqueId = Math.floor(Date.now() / 1000);
  const generationTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const expirationTime = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generationTime}</generationTime>
    <expirationTime>${expirationTime}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

function execFileAsync(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    const stdout = [];
    const stderr = [];

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `OpenSSL termino con codigo ${code}: ${Buffer.concat(stderr).toString("utf8")}`
          )
        );
        return;
      }

      resolve(Buffer.concat(stdout));
    });
  });
}

async function signTraWithOpenSsl(traXml, config) {
  const tempDir = path.join(os.tmpdir(), "apppanaderia-arca");
  fs.mkdirSync(tempDir, { recursive: true });

  const id = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const traPath = path.join(tempDir, `${id}.xml`);
  const cmsPath = path.join(tempDir, `${id}.cms`);

  fs.writeFileSync(traPath, traXml, "utf8");

  try {
    await execFileAsync(config.opensslPath, [
      "cms",
      "-sign",
      "-in",
      traPath,
      "-signer",
      config.certPath,
      "-inkey",
      config.keyPath,
      "-nodetach",
      "-outform",
      "der",
      "-out",
      cmsPath,
    ]);

    return fs.readFileSync(cmsPath).toString("base64");
  } finally {
    fs.rmSync(traPath, { force: true });
    fs.rmSync(cmsPath, { force: true });
  }
}

function buildLoginCmsEnvelope(cms) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${escapeXml(cms)}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;
}

async function loginWsaa(service = "wsfe", profileId) {
  const config = getArcaConfig(profileId);
  const tra = buildLoginTicketRequest(service);
  const cms = await signTraWithOpenSsl(tra, config);
  const envelope = buildLoginCmsEnvelope(cms);

  const response = await axios.post(config.wsaaUrl, envelope, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "",
    },
    httpsAgent: arcaHttpsAgent,
    timeout: 30000,
  });

  const loginCmsReturn = extractTag(response.data, "loginCmsReturn");

  if (!loginCmsReturn) {
    throw new Error(`WSAA no devolvio loginCmsReturn: ${response.data}`);
  }

  const ticketXml = decodeXmlEntities(loginCmsReturn);

  return {
    token: extractTag(ticketXml, "token"),
    sign: extractTag(ticketXml, "sign"),
    expirationTime: extractTag(ticketXml, "expirationTime"),
    generationTime: extractTag(ticketXml, "generationTime"),
    raw: ticketXml,
  };
}

async function getWsaaTicket(profileId) {
  const config = getArcaConfig(profileId);
  const cacheKey = `${config.env}:${config.profileId}`;
  const cachedTicket = cachedTickets.get(cacheKey);

  if (
    cachedTicket?.token &&
    cachedTicket?.sign &&
    new Date(cachedTicket.expirationTime).getTime() > Date.now() + 5 * 60 * 1000
  ) {
    return cachedTicket;
  }

  const ticket = await loginWsaa("wsfe", profileId);
  cachedTickets.set(cacheKey, ticket);
  return ticket;
}

function buildWsfeEnvelope(operation, body) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${operation} xmlns="http://ar.gov.afip.dif.FEV1/">
      ${body}
    </${operation}>
  </soap:Body>
</soap:Envelope>`;
}

async function callWsfe(operation, body) {
  const config = getArcaConfig();
  const envelope = buildWsfeEnvelope(operation, body);

  const response = await axios.post(config.wsfeUrl, envelope, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `http://ar.gov.afip.dif.FEV1/${operation}`,
    },
    httpsAgent: arcaHttpsAgent,
    timeout: 30000,
  });

  return response.data;
}

async function consultarUltimoComprobante(profileId) {
  const config = getArcaConfig(profileId);
  const ticket = await getWsaaTicket(profileId);
  const xml = await callWsfe(
    "FECompUltimoAutorizado",
    `<Auth>
        <Token>${escapeXml(ticket.token)}</Token>
        <Sign>${escapeXml(ticket.sign)}</Sign>
        <Cuit>${config.cuit}</Cuit>
      </Auth>
      <PtoVta>${config.puntoVenta}</PtoVta>
      <CbteTipo>${config.comprobanteTipo}</CbteTipo>`
  );

  const errorsXml = extractSection(xml, "Errors");
  const errorCode = extractTag(errorsXml, "Code");
  const errorMessage = extractTag(errorsXml, "Msg");

  if (errorCode && errorMessage) {
    throw new Error(`WSFE error ${errorCode}: ${errorMessage}`);
  }

  const eventsXml = extractSection(xml, "Events");

  return {
    puntoVenta: Number(extractTag(xml, "PtoVta")),
    comprobanteTipo: Number(extractTag(xml, "CbteTipo")),
    ultimoNumero: Number(extractTag(xml, "CbteNro") || 0),
    evento: extractTag(eventsXml, "Msg"),
    raw: xml,
  };
}

async function consultarComprobante(numero, profileId) {
  const config = getArcaConfig(profileId);
  const ticket = await getWsaaTicket(profileId);
  const xml = await callWsfe(
    "FECompConsultar",
    `<Auth>
        <Token>${escapeXml(ticket.token)}</Token>
        <Sign>${escapeXml(ticket.sign)}</Sign>
        <Cuit>${config.cuit}</Cuit>
      </Auth>
      <FeCompConsReq>
        <CbteTipo>${config.comprobanteTipo}</CbteTipo>
        <CbteNro>${Number(numero)}</CbteNro>
        <PtoVta>${config.puntoVenta}</PtoVta>
      </FeCompConsReq>`
  );

  const errorsXml = extractSection(xml, "Errors");
  const errorCode = extractTag(errorsXml, "Code");
  const errorMessage = extractTag(errorsXml, "Msg");

  if (errorCode && errorMessage) {
    return {
      existe: false,
      numero: Number(numero),
      error: `WSFE error ${errorCode}: ${errorMessage}`,
    };
  }

  const resultXml = extractSection(xml, "ResultGet");

  return {
    existe: Boolean(resultXml),
    numero: Number(numero),
    puntoVenta: Number(extractTag(resultXml, "PtoVta")),
    comprobanteTipo: Number(extractTag(resultXml, "CbteTipo")),
    resultado: extractTag(resultXml, "Resultado"),
    cae: extractTag(resultXml, "CodAutorizacion"),
    fechaVencimiento: extractTag(resultXml, "FchVto"),
    fechaProceso: extractTag(resultXml, "FchProceso"),
    importeTotal: Number(extractTag(resultXml, "ImpTotal") || 0),
    docTipo: extractTag(resultXml, "DocTipo"),
    docNro: extractTag(resultXml, "DocNro"),
  };
}

async function consultarComprobantesHastaUltimo(profileId) {
  const ultimo = await consultarUltimoComprobante(profileId);
  const comprobantes = [];

  for (let numero = 1; numero <= ultimo.ultimoNumero; numero += 1) {
    comprobantes.push(await consultarComprobante(numero, profileId));
  }

  return {
    ultimoComprobante: ultimo.ultimoNumero,
    comprobantes,
  };
}

function getObservaciones(xml) {
  const observacionesXml = extractSection(xml, "Observaciones");
  const matches = [...observacionesXml.matchAll(/<Msg>([\s\S]*?)<\/Msg>/g)];
  return matches.map((match) => decodeXmlEntities(match[1].trim()));
}

async function emitirFacturaArca({ total, cliente = {}, profileId }) {
  const config = getArcaConfig(profileId);
  const ticket = await getWsaaTicket(profileId);
  const ultimo = await consultarUltimoComprobante(profileId);
  const numero = ultimo.ultimoNumero + 1;
  const fecha = formatArcaDate();
  const importe = formatAmount(total);
  const { docTipo, docNro } = getDocumentoConsumidorFinal(cliente);

  const xml = await callWsfe(
    "FECAESolicitar",
    `<Auth>
        <Token>${escapeXml(ticket.token)}</Token>
        <Sign>${escapeXml(ticket.sign)}</Sign>
        <Cuit>${config.cuit}</Cuit>
      </Auth>
      <FeCAEReq>
        <FeCabReq>
          <CantReg>1</CantReg>
          <PtoVta>${config.puntoVenta}</PtoVta>
          <CbteTipo>${config.comprobanteTipo}</CbteTipo>
        </FeCabReq>
        <FeDetReq>
          <FECAEDetRequest>
            <Concepto>1</Concepto>
            <DocTipo>${docTipo}</DocTipo>
            <DocNro>${docNro}</DocNro>
            <CbteDesde>${numero}</CbteDesde>
            <CbteHasta>${numero}</CbteHasta>
            <CbteFch>${fecha}</CbteFch>
            <ImpTotal>${importe}</ImpTotal>
            <ImpTotConc>0.00</ImpTotConc>
            <ImpNeto>${importe}</ImpNeto>
            <ImpOpEx>0.00</ImpOpEx>
            <ImpTrib>0.00</ImpTrib>
            <ImpIVA>0.00</ImpIVA>
            <MonId>PES</MonId>
            <MonCotiz>1.000000</MonCotiz>
          </FECAEDetRequest>
        </FeDetReq>
      </FeCAEReq>`
  );

  const errorsXml = extractSection(xml, "Errors");
  const errorCode = extractTag(errorsXml, "Code");
  const errorMessage = extractTag(errorsXml, "Msg");

  if (errorCode && errorMessage) {
    throw new Error(`WSFE error ${errorCode}: ${decodeXmlEntities(errorMessage)}`);
  }

  const detailXml = extractSection(xml, "FECAEDetResponse");
  const resultado = extractTag(detailXml, "Resultado") || extractTag(xml, "Resultado");
  const cae = extractTag(detailXml, "CAE");
  const vencimientoCae = extractTag(detailXml, "CAEFchVto");
  const observaciones = getObservaciones(detailXml);

  if (resultado !== "A" || !cae) {
    const detalle = observaciones.length ? ` Observaciones: ${observaciones.join(" | ")}` : "";
    throw new Error(`Factura rechazada por ARCA. Resultado: ${resultado || "sin resultado"}.${detalle}`);
  }

  return {
    proveedor: "ARCA",
    profile_id: config.profileId,
    profile_label: config.profileLabel,
    cuit: config.cuit,
    resultado,
    cae,
    vencimiento_cae: vencimientoCae,
    numero_comprobante: numero,
    punto_venta: config.puntoVenta,
    tipo_comprobante: config.comprobanteTipo,
    fecha,
    total: Number(importe),
    doc_tipo: docTipo,
    doc_nro: docNro,
    observaciones,
    raw: xml,
  };
}

async function probarConexionArca() {
  const config = getArcaConfig();
  const ticket = await getWsaaTicket();
  const ultimo = await consultarUltimoComprobante();

  return {
    ambiente: config.env,
    perfil: config.profileLabel,
    cuit: config.cuit,
    puntoVenta: config.puntoVenta,
    comprobanteTipo: config.comprobanteTipo,
    ticketExpira: ticket.expirationTime,
    ultimoComprobante: ultimo.ultimoNumero,
    proximoComprobante: ultimo.ultimoNumero + 1,
    evento: ultimo.evento,
  };
}

module.exports = {
  getArcaConfig,
  loginWsaa,
  getWsaaTicket,
  consultarUltimoComprobante,
  consultarComprobante,
  consultarComprobantesHastaUltimo,
  emitirFacturaArca,
  probarConexionArca,
};
