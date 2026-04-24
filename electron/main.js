const { app, BrowserWindow } = require("electron");
const { exec, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

let backendProcess;

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
  const npm         = process.platform === "win32" ? "npm.cmd" : "npm";
  const rootDir     = path.join(__dirname, "..");
  const frontendCwd = path.join(rootDir, "frontend");
  const backendCwd  = path.join(rootDir, "backend");
  const backendEntry = path.join(backendCwd, "index.js");
  const distPath    = path.join(frontendCwd, "dist");

  // 1. Buildear el frontend solo si dist no existe
  if (!fs.existsSync(distPath)) {
    console.log("Buildeando frontend...");
    try {
      execSync(`${npm} run build`, { cwd: frontendCwd, stdio: "inherit" });
      console.log("Build completado.");
    } catch (err) {
      console.error("Error en el build del frontend:", err.message);
      app.quit();
      return;
    }
  } else {
    console.log("Frontend ya buildeado, saltando build.");
  }

  // 2. Levantar el backend
  console.log("Iniciando backend...");
  backendProcess = exec(`node "${backendEntry}"`, {
    cwd: backendCwd,
    env: { ...process.env }
  });

  backendProcess.stdout.on("data", (d) => console.log("[Backend]", d.trim()));
  backendProcess.stderr.on("data", (d) => console.error("[Backend error]", d.trim()));
  backendProcess.on("error", (err) => console.error("Error al iniciar backend:", err));
  backendProcess.on("exit", (code, signal) => {
    console.error(`[Backend] Proceso terminado. Código: ${code}, Señal: ${signal}`);
  });

  // 3. Esperar que el backend levante y abrir la ventana
  setTimeout(createWindow, 2000);
});

app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  app.quit();
});