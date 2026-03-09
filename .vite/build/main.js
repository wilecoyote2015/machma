"use strict";
const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      /**
       * Preload runs in an isolated context; it can call Node.js/Electron APIs
       * and expose them to the renderer via contextBridge.
       */
      preload: path.join(__dirname, "preload.js"),
      /** Strict isolation: renderer cannot access Node.js or Electron APIs directly. */
      contextIsolation: true,
      /** Never expose Node.js to the renderer; all access goes through IPC. */
      nodeIntegration: false
    }
  });
  {
    mainWindow.loadURL("http://localhost:5173");
  }
}
electron.app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
function resolvePath(root, rel) {
  return path.join(root, ...rel.split("/"));
}
async function listRecursive(dir, prefix = "") {
  const files = [];
  const dirs = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      dirs.push(relPath);
      const sub = await listRecursive(path.join(dir, entry.name), relPath);
      files.push(...sub.files);
      dirs.push(...sub.dirs);
    } else {
      files.push(relPath);
    }
  }
  return { files, dirs };
}
function registerIpcHandlers() {
  electron.ipcMain.handle("fs:openDirectory", async () => {
    const result = await electron.dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Open Machma Project Folder"
    });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle("fs:readFile", async (_event, root, rel) => {
    return fs.readFile(resolvePath(root, rel), "utf-8");
  });
  electron.ipcMain.handle(
    "fs:writeFile",
    async (_event, root, rel, content) => {
      const fullPath = resolvePath(root, rel);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
    }
  );
  electron.ipcMain.handle("fs:deleteFile", async (_event, root, rel) => {
    await fs.unlink(resolvePath(root, rel));
  });
  electron.ipcMain.handle(
    "fs:listDirectory",
    async (_event, root, subPath = "") => {
      const scanRoot = subPath ? path.join(root, ...subPath.split("/")) : root;
      try {
        return await listRecursive(scanRoot);
      } catch {
        return { files: [], dirs: [] };
      }
    }
  );
  electron.ipcMain.handle("fs:ensureDir", async (_event, root, rel) => {
    await fs.mkdir(resolvePath(root, rel), { recursive: true });
  });
  electron.ipcMain.handle(
    "fs:getTimestamp",
    async (_event, root, rel) => {
      try {
        const stat = await fs.stat(resolvePath(root, rel));
        return stat.mtimeMs;
      } catch {
        return 0;
      }
    }
  );
  electron.ipcMain.handle("fs:fileExists", async (_event, root, rel) => {
    try {
      await fs.access(resolvePath(root, rel));
      return true;
    } catch {
      return false;
    }
  });
}
