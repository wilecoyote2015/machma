/**
 * Electron preload script.
 *
 * Exposes a typed `window.electronAPI` surface to the renderer via
 * contextBridge so the renderer never touches Node.js or Electron APIs
 * directly (contextIsolation = true in main.ts).
 *
 * Each method is a thin delegate to the matching ipcMain.handle channel
 * in electron/main.ts.  The full API contract is typed in src/vite-env.d.ts.
 */

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openDirectory: () =>
    ipcRenderer.invoke("fs:openDirectory"),

  readFile: (root: string, rel: string) =>
    ipcRenderer.invoke("fs:readFile", root, rel),

  writeFile: (root: string, rel: string, content: string) =>
    ipcRenderer.invoke("fs:writeFile", root, rel, content),

  deleteFile: (root: string, rel: string) =>
    ipcRenderer.invoke("fs:deleteFile", root, rel),

  listDirectory: (root: string, subPath?: string) =>
    ipcRenderer.invoke("fs:listDirectory", root, subPath),

  ensureDirectory: (root: string, rel: string) =>
    ipcRenderer.invoke("fs:ensureDir", root, rel),

  getTimestamp: (root: string, rel: string) =>
    ipcRenderer.invoke("fs:getTimestamp", root, rel),

  fileExists: (root: string, rel: string) =>
    ipcRenderer.invoke("fs:fileExists", root, rel),
});
