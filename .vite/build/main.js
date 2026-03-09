"use strict";
const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  {
    win.loadURL("http://localhost:5173");
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
  return path.join(root, rel);
}
async function listRecursive(dir, prefix = "") {
  const files = [];
  const dirs = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
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
  electron.ipcMain.handle(
    "fs:readFile",
    (_event, root, rel) => fs.readFile(resolvePath(root, rel), "utf-8")
  );
  electron.ipcMain.handle(
    "fs:writeFile",
    async (_event, root, rel, content) => {
      const fullPath = resolvePath(root, rel);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
    }
  );
  electron.ipcMain.handle(
    "fs:deleteFile",
    (_event, root, rel) => fs.unlink(resolvePath(root, rel))
  );
  electron.ipcMain.handle(
    "fs:listDirectory",
    async (_event, root, subPath) => {
      try {
        return await listRecursive(subPath ? resolvePath(root, subPath) : root);
      } catch {
        return { files: [], dirs: [] };
      }
    }
  );
  electron.ipcMain.handle(
    "fs:ensureDir",
    (_event, root, rel) => fs.mkdir(resolvePath(root, rel), { recursive: true })
  );
  electron.ipcMain.handle(
    "fs:getTimestamp",
    async (_event, root, rel) => {
      try {
        return (await fs.stat(resolvePath(root, rel))).mtimeMs;
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
