let electronModule;

try {
  electronModule = require("electron/main");
} catch {
  electronModule = require("electron");
}

const { app, BrowserWindow, dialog, ipcMain } = electronModule;
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createAutoUpdateController } = require("./auto-update.cjs");
const { loadEnvFileIntoProcess } = require("./runtime-env.cjs");

const appRoot = path.resolve(__dirname, "..");

app.setName("Logistica CATRAIA");

const isDevelopment = !app.isPackaged;
const windowState = {
  width: 1440,
  height: 920,
  minWidth: 1180,
  minHeight: 760,
};

let backendHandle = null;
let backendShutdownPromise = null;
let mainWindow = null;
let autoUpdateController = null;

function getSenderWindow(sender) {
  return BrowserWindow.fromWebContents(sender) || mainWindow;
}

function broadcastMaximizeState(targetWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(
    "desktop-window:maximize-changed",
    targetWindow.isMaximized(),
  );
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function resolveDesktopEnvPath() {
  if (isDevelopment) {
    return path.join(appRoot, ".env");
  }

  return path.join(app.getPath("userData"), "database.env");
}

async function ensureDesktopEnvFile(envPath) {
  if (isDevelopment) {
    return;
  }

  try {
    await fs.access(envPath);
    return;
  } catch {
    const examplePath = path.join(appRoot, ".env.example");
    let template = [
      "PGHOST=localhost",
      "PGPORT=5432",
      "PGDATABASE=example_catraia",
      "PGUSER=example_catraia_user",
      "PGPASSWORD=sua_senha",
      "PGSSL=false",
      "AUTO_UPDATE_URL=",
      "AUTO_UPDATE_CHECK_MINUTES=30",
      "",
    ].join("\n");

    try {
      template = await fs.readFile(examplePath, "utf-8");
    } catch {
      // Falls back to the inline template when the example file is unavailable.
    }

    await fs.mkdir(path.dirname(envPath), { recursive: true });
    await fs.writeFile(envPath, template, "utf-8");
  }
}

async function ensureRuntimeEnvLoaded() {
  const envPath = resolveDesktopEnvPath();

  await ensureDesktopEnvFile(envPath);
  await loadEnvFileIntoProcess(envPath);

  return envPath;
}

async function startDesktopBackend() {
  if (backendHandle) {
    return backendHandle;
  }

  const envPath = await ensureRuntimeEnvLoaded();
  process.env.APP_ROOT = appRoot;
  process.env.APP_ENV_PATH = envPath;

  const serverModuleUrl = pathToFileURL(
    path.join(appRoot, "server", "index.js"),
  ).href;
  const { startServer } = await import(serverModuleUrl);

  backendHandle = await startServer({
    host: "127.0.0.1",
    port: isDevelopment ? 3001 : 0,
    projectRoot: appRoot,
  });

  return backendHandle;
}

async function stopDesktopBackend() {
  if (!backendHandle) {
    return;
  }

  if (!backendShutdownPromise) {
    backendShutdownPromise = backendHandle.close().finally(() => {
      backendHandle = null;
      backendShutdownPromise = null;
    });
  }

  await backendShutdownPromise;
}

async function startAutoUpdateController() {
  await ensureRuntimeEnvLoaded();

  if (!autoUpdateController) {
    autoUpdateController = createAutoUpdateController({
      isDevelopment,
      getWindow: () => mainWindow,
    });
  }

  await autoUpdateController.start();
}

async function createMainWindow() {
  const backend = await startDesktopBackend();
  const targetUrl = isDevelopment ? "http://localhost:5173" : backend.url;

  mainWindow = new BrowserWindow({
    ...windowState,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#f6f4ef",
    title: "Fabiana Transportes Maritimos",
    icon: isDevelopment ? path.join(appRoot, "build", "icon.png") : undefined,
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      preload: path.join(appRoot, "electron", "preload.cjs"),
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("maximize", () => {
    broadcastMaximizeState(mainWindow);
  });

  mainWindow.on("unmaximize", () => {
    broadcastMaximizeState(mainWindow);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    broadcastMaximizeState(mainWindow);
  });

  const retryCount = isDevelopment ? 20 : 1;
  let lastError = null;

  for (let attempt = 1; attempt <= retryCount; attempt += 1) {
    try {
      await mainWindow.loadURL(targetUrl);
      return;
    } catch (error) {
      lastError = error;

      if (attempt === retryCount) {
        break;
      }

      await wait(500);
    }
  }

  throw lastError;
}

async function bootstrapDesktopApp() {
  try {
    await createMainWindow();
    await startAutoUpdateController();
  } catch (error) {
    const envPath = resolveDesktopEnvPath();
    const description =
      error instanceof Error ? error.message : "Erro inesperado ao iniciar o software.";

    dialog.showErrorBox(
      "Falha ao abrir o Logistica CATRAIA",
      [
        description,
        "",
        "Verifique a conexao com o PostgreSQL e as configuracoes do arquivo:",
        envPath,
      ].join("\n"),
    );

    await stopDesktopBackend();
    app.quit();
  }
}

app.whenReady().then(bootstrapDesktopApp);

ipcMain.handle("desktop-window:minimize", (event) => {
  getSenderWindow(event.sender)?.minimize();
});

ipcMain.handle("desktop-window:toggle-maximize", (event) => {
  const targetWindow = getSenderWindow(event.sender);

  if (!targetWindow) {
    return;
  }

  if (targetWindow.isMaximized()) {
    targetWindow.unmaximize();
    return;
  }

  targetWindow.maximize();
});

ipcMain.handle("desktop-window:close", (event) => {
  getSenderWindow(event.sender)?.close();
});

ipcMain.handle("desktop-window:is-maximized", (event) => {
  return Boolean(getSenderWindow(event.sender)?.isMaximized());
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void bootstrapDesktopApp();
  }
});

app.on("before-quit-for-update", () => {
  autoUpdateController?.stop();
  void stopDesktopBackend();
});

app.on("before-quit", () => {
  autoUpdateController?.stop();
  void stopDesktopBackend();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    void stopDesktopBackend().finally(() => {
      app.quit();
    });
  }
});
