const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");

const fs = require("fs");

function log(msg) {
  fs.appendFileSync(
    "C:/apppanaderia/log.txt",
    `[${new Date().toISOString()}] ${msg}\n`
  );
}

process.on("uncaughtException", (err) => {
  log("UNCAUGHT EXCEPTION:");
  log(err.stack || err.message);
});

process.on("unhandledRejection", (err) => {
  log("UNHANDLED REJECTION:");
  log(String(err));
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
          reject(new Error("Backend no respondió a tiempo"));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
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

  // Ambos usan HTTP — React Router funciona bien
  if (app.isPackaged) {
    win.loadURL("http://localhost:3001");
  } else {
    win.loadURL("http://localhost:3000");
  }
}

app.whenReady().then(async () => {
  const isDev = !app.isPackaged;

  const dbDir = path.join("C:", "apppanaderia", "data");
  const fs = require("fs");

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  log(`APP_DATA_DIR: ${dbDir}`);
  log(`IS_DEV: ${isDev}`);
  log(`IS_PACKAGED: ${app.isPackaged}`);
  console.log("IS_DEV:", isDev);
  console.log("IS_PACKAGED:", app.isPackaged);

  process.env.APP_DATA_DIR = dbDir;

  

  if (isDev) {
    // En dev el backend ya corre con nodemon
    createWindow();
  } else {
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
      log(err.message || String(err));

      if (err.stack) {
      log(err.stack);
      }

    app.quit();
    return;
    }
    log("Esperando backend...");
    try {
      await waitForBackend();
      log("Backend respondió OK");
      log("Creando ventana...");
      createWindow();
    } catch (err) {
      console.error("Backend no respondió:", err);
      app.quit();
    }
  }
});

app.on("window-all-closed", () => {
  app.quit();
});