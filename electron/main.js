const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

const appDir = path.join("C:", "apppanaderia");
const logPath = path.join(appDir, "log.txt");
let backendStartError = null;

function escapeHtml(value) {
  return String(value || "").replace(/[<>&]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
  }[char]));
}

function log(msg) {
  try {
    fs.mkdirSync(appDir, { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (err) {
    console.error("No se pudo escribir log:", err);
  }
}

process.on("uncaughtException", (err) => {
  log("UNCAUGHT EXCEPTION:");
  log(err.stack || err.message || String(err));
});

process.on("unhandledRejection", (err) => {
  log("UNHANDLED REJECTION:");
  log(err.stack || err.message || String(err));
});

process.on("backend-start-error", (err) => {
  backendStartError = err;
  log("BACKEND START ERROR:");
  log(err.stack || err.message || String(err));
});

log("=== INICIO ELECTRON ===");

function waitForBackend(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http.get("http://localhost:3001/api/productos", () => {
        resolve();
      }).on("error", () => {
        if (Date.now() - start > timeout) {
          reject(backendStartError || new Error("Backend no respondio a tiempo"));
          return;
        }

        setTimeout(check, 300);
      });
    };

    check();
  });
}

function createErrorWindow(message) {
  const win = new BrowserWindow({
    width: 760,
    height: 460,
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 28px; color: #241a12;">
        <h1>No se pudo iniciar POS Panaderia</h1>
        <p>El programa no pudo levantar el servidor interno.</p>
        <pre style="white-space: pre-wrap; background: #f4eadf; padding: 16px; border-radius: 8px;">${escapeHtml(message)}</pre>
        <p>Revisa el log para mas detalle:</p>
        <strong>${escapeHtml(logPath)}</strong>
      </body>
    </html>
  `;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const refocusWebContents = () => {
    if (!win.isDestroyed()) {
      win.focus();
      win.webContents.focus();
    }
  };

  win.on("focus", () => setTimeout(refocusWebContents, 0));
  win.on("show", () => setTimeout(refocusWebContents, 0));
  win.webContents.on("did-finish-load", () => refocusWebContents());
  win.webContents.on("before-input-event", () => {
    if (!win.webContents.isFocused()) win.webContents.focus();
  });

  const url = app.isPackaged ? "http://localhost:3001" : "http://localhost:3000";
  win.loadURL(url).catch((err) => {
    log(`ERROR CARGANDO FRONTEND: ${err.message}`);
    createErrorWindow(err.stack || err.message);
  });
}

app.whenReady().then(async () => {
  const isDev = !app.isPackaged;
  const dbDir = path.join(appDir, "data");

  fs.mkdirSync(dbDir, { recursive: true });

  log(`APP_DATA_DIR: ${dbDir}`);
  log(`IS_DEV: ${isDev}`);
  log(`IS_PACKAGED: ${app.isPackaged}`);
  console.log("IS_DEV:", isDev);
  console.log("IS_PACKAGED:", app.isPackaged);

  process.env.APP_DATA_DIR = dbDir;

  if (isDev) {
    createWindow();
    return;
  }

  const backendEntry = path.join(
    process.resourcesPath,
    "app.asar.unpacked",
    "backend",
    "index.js"
  );

  process.env.FRONTEND_DIST_PATH = path.join(
    process.resourcesPath,
    "app.asar.unpacked",
    "frontend",
    "dist"
  );

  log("Cargando backend...");
  log(backendEntry);

  try {
    require(backendEntry);
    log("Backend cargado OK");
  } catch (err) {
    log("ERROR AL CARGAR BACKEND");
    log(err.stack || err.message || String(err));
    createErrorWindow(err.stack || err.message || String(err));
    return;
  }

  log("Esperando backend...");

  try {
    await waitForBackend();
    log("Backend respondio OK");
    log("Creando ventana...");
    createWindow();
  } catch (err) {
    console.error("Backend no respondio:", err);
    log("Backend no respondio:");
    log(err.stack || err.message || String(err));
    createErrorWindow(err.stack || err.message || String(err));
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
