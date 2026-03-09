/**
 * Electron preload script.
 *
 * Runs in a special context that has access to both Electron IPC and browser
 * globals.  Uses contextBridge to expose a typed `window.electronAPI` surface
 * to the renderer, so the renderer never touches Node.js or Electron APIs
 * directly (contextIsolation = true in main.ts).
 *
 * Every method here is a thin wrapper that forwards the call to the
 * corresponding IPC handler in electron/main.ts via ipcRenderer.invoke.
 */

import { contextBridge, ipcRenderer } from "electron";

/**
 * The electronAPI object exposed on `window` in the renderer process.
 * Its TypeScript type is declared in src/vite-env.d.ts.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Open an OS-native directory picker.
   * @returns The absolute path of the chosen directory, or null if cancelled.
   */
  openDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke("fs:openDirectory"),

  /**
   * Read a UTF-8 text file relative to a project root path.
   * @param root - Absolute path to the project directory.
   * @param rel  - Forward-slash-separated path relative to `root`.
   */
  readFile: (root: string, rel: string): Promise<string> =>
    ipcRenderer.invoke("fs:readFile", root, rel),

  /**
   * Write UTF-8 content to a file relative to a project root.
   * Missing parent directories are created automatically.
   */
  writeFile: (root: string, rel: string, content: string): Promise<void> =>
    ipcRenderer.invoke("fs:writeFile", root, rel, content),

  /**
   * Delete a file relative to a project root.
   */
  deleteFile: (root: string, rel: string): Promise<void> =>
    ipcRenderer.invoke("fs:deleteFile", root, rel),

  /**
   * Recursively list all files and subdirectory paths under a sub-directory
   * of `root`.  Paths are returned relative to that sub-directory.
   *
   * @param root    - Absolute project root path.
   * @param subPath - Optional sub-directory to scan (forward-slash separated).
   */
  listDirectory: (
    root: string,
    subPath?: string,
  ): Promise<{ files: string[]; dirs: string[] }> =>
    ipcRenderer.invoke("fs:listDirectory", root, subPath),

  /**
   * Ensure a directory path exists under `root`, creating any missing
   * ancestor directories.
   */
  ensureDirectory: (root: string, rel: string): Promise<void> =>
    ipcRenderer.invoke("fs:ensureDir", root, rel),

  /**
   * Return the last-modified timestamp (ms since epoch) of a file, or 0 if
   * the file does not exist.
   */
  getTimestamp: (root: string, rel: string): Promise<number> =>
    ipcRenderer.invoke("fs:getTimestamp", root, rel),

  /**
   * Check whether a file exists relative to a project root.
   */
  fileExists: (root: string, rel: string): Promise<boolean> =>
    ipcRenderer.invoke("fs:fileExists", root, rel),
});
