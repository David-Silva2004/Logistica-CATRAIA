const { dialog } = require("electron");
const { NsisUpdater } = require("electron-updater");

function normalizeUrl(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isPortableRuntime() {
  return Boolean(
    process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR,
  );
}

function createAutoUpdateController({ getWindow, isDevelopment }) {
  let updater = null;
  let checkIntervalId = null;
  let isRestartPromptOpen = false;

  function stop() {
    if (checkIntervalId) {
      clearInterval(checkIntervalId);
      checkIntervalId = null;
    }
  }

  async function checkNow() {
    if (!updater) {
      return false;
    }

    try {
      await updater.checkForUpdates();
      return true;
    } catch (error) {
      console.error("Falha ao verificar atualizacoes.", error);
      return false;
    }
  }

  async function start() {
    if (updater || isDevelopment || isPortableRuntime()) {
      return false;
    }

    const updateUrl = normalizeUrl(process.env.AUTO_UPDATE_URL);

    if (!updateUrl) {
      return false;
    }

    updater = new NsisUpdater({
      provider: "generic",
      url: updateUrl,
      channel: process.env.AUTO_UPDATE_CHANNEL || "latest",
    });

    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;

    updater.on("checking-for-update", () => {
      console.log(`Verificando atualizacoes em ${updateUrl}...`);
    });

    updater.on("update-available", (info) => {
      console.log(
        `Nova versao encontrada: ${info?.version || "versao desconhecida"}.`,
      );
    });

    updater.on("update-not-available", () => {
      console.log("Nenhuma atualizacao disponivel.");
    });

    updater.on("download-progress", (progress) => {
      const percent = Number.isFinite(progress?.percent)
        ? progress.percent.toFixed(1)
        : "0.0";
      console.log(`Baixando atualizacao: ${percent}%`);
    });

    updater.on("update-downloaded", async (info) => {
      if (isRestartPromptOpen) {
        return;
      }

      isRestartPromptOpen = true;

      try {
        const targetWindow = getWindow?.();
        const result = await dialog.showMessageBox(targetWindow ?? undefined, {
          type: "info",
          buttons: ["Reiniciar agora", "Depois"],
          defaultId: 0,
          cancelId: 1,
          title: "Atualizacao pronta",
          message: `A versao ${info?.version || "mais recente"} foi baixada.`,
          detail:
            "O aplicativo pode reiniciar agora para aplicar a atualizacao.",
        });

        if (result.response === 0) {
          updater.quitAndInstall();
        }
      } catch (error) {
        console.error("Falha ao concluir a instalacao da atualizacao.", error);
      } finally {
        isRestartPromptOpen = false;
      }
    });

    updater.on("error", (error) => {
      console.error("Erro no auto-update.", error);
    });

    const intervalMinutes = normalizePositiveInteger(
      process.env.AUTO_UPDATE_CHECK_MINUTES,
      30,
    );

    setTimeout(() => {
      void checkNow();
    }, 12_000);

    checkIntervalId = setInterval(() => {
      void checkNow();
    }, intervalMinutes * 60_000);

    return true;
  }

  return {
    start,
    stop,
    checkNow,
  };
}

module.exports = {
  createAutoUpdateController,
};
