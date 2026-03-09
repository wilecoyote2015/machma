"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  openDirectory: () => electron.ipcRenderer.invoke("fs:openDirectory"),
  readFile: (root, rel) => electron.ipcRenderer.invoke("fs:readFile", root, rel),
  writeFile: (root, rel, content) => electron.ipcRenderer.invoke("fs:writeFile", root, rel, content),
  deleteFile: (root, rel) => electron.ipcRenderer.invoke("fs:deleteFile", root, rel),
  listDirectory: (root, subPath) => electron.ipcRenderer.invoke("fs:listDirectory", root, subPath),
  ensureDirectory: (root, rel) => electron.ipcRenderer.invoke("fs:ensureDir", root, rel),
  getTimestamp: (root, rel) => electron.ipcRenderer.invoke("fs:getTimestamp", root, rel),
  fileExists: (root, rel) => electron.ipcRenderer.invoke("fs:fileExists", root, rel),
  getRecentProjects: () => electron.ipcRenderer.invoke("app:getRecentProjects"),
  pushRecentProject: (entry) => electron.ipcRenderer.invoke("app:pushRecentProject", entry)
});
