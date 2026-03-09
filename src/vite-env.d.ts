/// <reference types="vite/client" />

/**
 * Type declaration for the Electron IPC bridge exposed to the renderer by
 * the preload script (electron/preload.ts) via contextBridge.
 *
 * Every method here maps 1-to-1 to an ipcMain.handle handler in
 * electron/main.ts.  The implementations use Node.js fs/promises.
 */
interface ElectronAPI {
  /**
   * Open an OS-native directory picker.
   * @returns The absolute path of the chosen directory, or null if cancelled.
   */
  openDirectory(): Promise<string | null>;

  /**
   * Read a UTF-8 text file relative to a project root path.
   * @param root - Absolute path to the project directory.
   * @param rel  - Forward-slash-separated path relative to `root`.
   */
  readFile(root: string, rel: string): Promise<string>;

  /**
   * Write UTF-8 content to a file relative to a project root.
   * Missing parent directories are created automatically.
   */
  writeFile(root: string, rel: string, content: string): Promise<void>;

  /**
   * Delete a file relative to a project root.
   */
  deleteFile(root: string, rel: string): Promise<void>;

  /**
   * Recursively list all files and subdirectory paths relative to a
   * sub-directory of `root`.
   *
   * @param root    - Absolute project root path.
   * @param subPath - Optional sub-directory to scan (forward-slash separated).
   */
  listDirectory(
    root: string,
    subPath?: string,
  ): Promise<{ files: string[]; dirs: string[] }>;

  /**
   * Ensure a directory path exists under `root`, creating any missing
   * ancestor directories.
   */
  ensureDirectory(root: string, rel: string): Promise<void>;

  /**
   * Return the last-modified timestamp (ms since epoch) of a file,
   * or 0 if the file does not exist.
   */
  getTimestamp(root: string, rel: string): Promise<number>;

  /**
   * Check whether a file exists relative to a project root.
   */
  fileExists(root: string, rel: string): Promise<boolean>;
}

interface Window {
  /** Injected by the Electron preload script via contextBridge. */
  readonly electronAPI: ElectronAPI;
}
