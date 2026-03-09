"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Open an OS-native directory picker.
   * @returns The absolute path of the chosen directory, or null if cancelled.
   */
  openDirectory: () => electron.ipcRenderer.invoke("fs:openDirectory"),
  /**
   * Read a UTF-8 text file relative to a project root path.
   * @param root - Absolute path to the project directory.
   * @param rel  - Forward-slash-separated path relative to `root`.
   */
  readFile: (root, rel) => electron.ipcRenderer.invoke("fs:readFile", root, rel),
  /**
   * Write UTF-8 content to a file relative to a project root.
   * Missing parent directories are created automatically.
   */
  writeFile: (root, rel, content) => electron.ipcRenderer.invoke("fs:writeFile", root, rel, content),
  /**
   * Delete a file relative to a project root.
   */
  deleteFile: (root, rel) => electron.ipcRenderer.invoke("fs:deleteFile", root, rel),
  /**
   * Recursively list all files and subdirectory paths under a sub-directory
   * of `root`.  Paths are returned relative to that sub-directory.
   *
   * @param root    - Absolute project root path.
   * @param subPath - Optional sub-directory to scan (forward-slash separated).
   */
  listDirectory: (root, subPath) => electron.ipcRenderer.invoke("fs:listDirectory", root, subPath),
  /**
   * Ensure a directory path exists under `root`, creating any missing
   * ancestor directories.
   */
  ensureDirectory: (root, rel) => electron.ipcRenderer.invoke("fs:ensureDir", root, rel),
  /**
   * Return the last-modified timestamp (ms since epoch) of a file, or 0 if
   * the file does not exist.
   */
  getTimestamp: (root, rel) => electron.ipcRenderer.invoke("fs:getTimestamp", root, rel),
  /**
   * Check whether a file exists relative to a project root.
   */
  fileExists: (root, rel) => electron.ipcRenderer.invoke("fs:fileExists", root, rel)
});
