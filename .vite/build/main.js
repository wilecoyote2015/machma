"use strict";
const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const MAX_RECENT = 5;
function recentProjectsFile() {
  return path.join(electron.app.getPath("userData"), "recent-projects.json");
}
async function loadRecentProjects() {
  try {
    const raw = await fs.readFile(recentProjectsFile(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
async function saveRecentProject(entry) {
  const existing = await loadRecentProjects();
  const deduped = existing.filter((e) => e.path !== entry.path);
  const updated = [entry, ...deduped].slice(0, MAX_RECENT);
  await fs.writeFile(recentProjectsFile(), JSON.stringify(updated, null, 2), "utf-8");
}
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    // The app ships its own nav bar, so the native OS menu bar is hidden.
    autoHideMenuBar: true,
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
  electron.ipcMain.handle("app:getRecentProjects", () => loadRecentProjects());
  electron.ipcMain.handle(
    "app:pushRecentProject",
    (_event, entry) => saveRecentProject(entry)
  );
}
