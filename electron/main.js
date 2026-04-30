const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");

function waitForBackend(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      http
        .get("http://localhost:3001/api/productos", (res) => {
          resolve();
        })
        .on("error", () => {
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

  // 🔥 DEV vs PROD
  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL("http://localhost:3000");
    win.webContents.openDevTools();
  } else {
    win.loadFile(
      path.join(__dirname, "../frontend/dist/index.html")
    );
  }

  win.webContents.on("did-finish-load", () => {
    win.focus();
  });
}

app.whenReady().then(async () => {
  const isDev = !app.isPackaged;

  // 📦 DB path seguro
  const dbDir = isDev
    ? path.join(__dirname, "../backend/db")
    : app.getPath("userData");

  process.env.APP_DATA_DIR = dbDir;

  if (isDev) {
    createWindow();

    // backend en dev
    require("../backend/index.js");
  } else {
    const backendEntry = path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "backend",
      "index.js"
    );

    try {
      require(backendEntry);
    } catch (err) {
      console.error("Error al cargar backend:", err);
      app.quit();
      return;
    }

    try {
      await waitForBackend();
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