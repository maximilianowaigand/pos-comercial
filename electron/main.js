const { app, BrowserWindow } = require("electron");
const path = require("path");

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

  let retries = 0;
  const tryLoad = setInterval(() => {
    win.loadURL("http://localhost:3000").then(() => {
      clearInterval(tryLoad);
    }).catch(() => {
      retries++;
      if (retries >= 20) {
        clearInterval(tryLoad);
        console.error("No se pudo cargar la app después de 20 intentos.");
      }
    });
  }, 1000);
}

app.whenReady().then(() => {
  const rootDir      = path.join(__dirname, "..");
  const backendEntry = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", "backend", "index.js")
    : path.join(rootDir, "backend", "index.js");
  const frontendDistPath = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar", "frontend", "dist")
    : path.join(rootDir, "frontend", "dist");

  process.env.FRONTEND_DIST_PATH = frontendDistPath;
  process.env.APP_DATA_DIR = app.getPath("userData");

  console.log("Cargando backend desde:", backendEntry);
  console.log("Sirviendo frontend desde:", frontendDistPath);
  console.log("Datos de la app en:", process.env.APP_DATA_DIR);

  try {
    require(backendEntry);
    console.log("Backend cargado correctamente.");
  } catch (err) {
    console.error("Error al cargar el backend:", err);
    app.quit();
    return;
  }

  // Esperar que Express levante y abrir la ventana
  setTimeout(createWindow, 4000);
});

app.on("window-all-closed", () => {
  app.quit();
});
