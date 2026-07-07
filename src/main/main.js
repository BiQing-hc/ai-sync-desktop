const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const { SyncEngine } = require("../shared/sync-engine");

let mainWindow;
let engine;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "AI Sync Desktop",
    icon: path.join(__dirname, "../../assets/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    },
    backgroundColor: "#0f172a",
    show: false,
    titleBarStyle: "hiddenInset",
    frame: process.platform === "darwin" ? true : true
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Build menu
  const menuTemplate = [
    {
      label: "File",
      submenu: [
        { label: "Sync Now", accelerator: "CmdOrCtrl+S", click: () => mainWindow.webContents.send("trigger-sync") },
        { label: "Refresh Platforms", accelerator: "CmdOrCtrl+R", click: () => mainWindow.webContents.send("refresh-platforms") },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" }
      ]
    },
    {
      label: "Help",
      submenu: [
        { label: "About AI Sync Desktop", click: () => {
          const { dialog } = require("electron");
          dialog.showMessageBox(mainWindow, {
            title: "About AI Sync Desktop",
            message: "AI Sync Desktop v1.0.0",
            detail: "Cross-platform AI skills, memory, and models synchronization.\nSupports 23 AI platforms across China and worldwide."
          });
        }}
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

app.whenReady().then(() => {
  engine = new SyncEngine("codebuddy");
  createWindow();

  // === IPC Handlers ===

  ipcMain.handle("get-platforms", () => {
    return engine.getAllPlatforms().map(p => ({
      id: p.id, name: p.name, vendor: p.vendor, region: p.region,
      icon: p.icon, color: p.color, installed: p.installed,
      skillsCount: p.skillsCount, compatibility: p.compatibility,
      compatInfo: p.compatInfo, description: p.description,
      configDir: p.resolvedDir, skillsDir: p.skillsDir,
      automationsDir: p.automationsDir, memoryDir: p.memoryDir,
      skillsFormat: p.skillsFormat
    }));
  });

  ipcMain.handle("get-source", () => {
    const source = engine.getSource();
    return source ? { id: source.id, name: source.name, icon: source.icon, color: source.color } : null;
  });

  ipcMain.handle("run-sync", async (_event, { platforms, options }) => {
    const targets = platforms
      ? engine.getTargets().filter(t => platforms.includes(t.id))
      : engine.getTargets();
    return await engine.runSync("push", targets, options || {});
  });

  ipcMain.handle("get-status", () => engine.getStatus());
  ipcMain.handle("get-sync-history", () => engine.getSyncHistory());
  ipcMain.handle("set-source", (_event, platformId) => {
    engine = new SyncEngine(platformId);
    return { success: true };
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
