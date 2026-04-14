const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopWindow", {
  isDesktop: true,
  minimize() {
    return ipcRenderer.invoke("desktop-window:minimize");
  },
  toggleMaximize() {
    return ipcRenderer.invoke("desktop-window:toggle-maximize");
  },
  close() {
    return ipcRenderer.invoke("desktop-window:close");
  },
  isMaximized() {
    return ipcRenderer.invoke("desktop-window:is-maximized");
  },
  onMaximizeChanged(callback) {
    const listener = (_event, isMaximized) => {
      callback(Boolean(isMaximized));
    };

    ipcRenderer.on("desktop-window:maximize-changed", listener);

    return () => {
      ipcRenderer.removeListener("desktop-window:maximize-changed", listener);
    };
  },
});
