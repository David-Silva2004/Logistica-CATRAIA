let electronModule;

try {
  electronModule = require("electron/main");
} catch {
  electronModule = require("electron");
}

const { app, BrowserWindow, dialog } = electronModule;
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

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

async function startDesktopBackend() {
  if (backendHandle) {
    return backendHandle;
  }

  const envPath = resolveDesktopEnvPath();
  process.env.APP_ROOT = appRoot;
  process.env.APP_ENV_PATH = envPath;

  await ensureDesktopEnvFile(envPath);

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

async function createMainWindow() {
  const backend = await startDesktopBackend();
  const targetUrl = isDevelopment ? "http://localhost:5173" : backend.url;

  mainWindow = new BrowserWindow({
    ...windowState,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f6f4ef",
    title: "Logistica CATRAIA",
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
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

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void bootstrapDesktopApp();
  }
});

app.on("before-quit", () => {
  void stopDesktopBackend();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    void stopDesktopBackend().finally(() => {
      app.quit();
    });
  }
});
