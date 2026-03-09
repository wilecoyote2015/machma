/**
 * Electron main process entry point.
 *
 * Responsibilities:
 *  - Create and manage the BrowserWindow.
 *  - Register all IPC handlers that the renderer calls via window.electronAPI.
 *  - Open an OS-native directory picker via Electron's dialog module.
 *
 * All file I/O is performed here using Node.js fs/promises so the renderer
 * never needs Node.js access (contextIsolation = true).
 */

import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";

// ── Forge Vite plugin injects these globals at build time ──────────────────
// MAIN_WINDOW_VITE_DEV_SERVER_URL  – dev server URL (undefined in production)
// MAIN_WINDOW_VITE_NAME            – renderer entry name (for production path)
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// ── Window creation ────────────────────────────────────────────────────────

/**
 * Create the main application window with security best practices:
 * contextIsolation enabled, nodeIntegration disabled, preload script injected.
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
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
      nodeIntegration: false,
    },
  });

  // In development the Forge Vite plugin runs a dev server; in production load
  // the compiled index.html from the .vite/renderer output directory.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

// ── App lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  /** macOS: re-create the window when the dock icon is clicked and no windows are open. */
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/** Quit on all windows closed (except macOS where the app stays alive). */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── Path helpers ───────────────────────────────────────────────────────────

/**
 * Join a project root path with a slash-separated relative path,
 * producing an absolute native path suitable for Node.js fs operations.
 *
 * Relative path segments use forward slashes (as stored in the project data
 * model); path.join normalises them for the current OS.
 */
function resolvePath(root: string, rel: string): string {
  return path.join(root, ...rel.split("/"));
}

/**
 * Recursively walk a directory and collect all file and sub-directory paths,
 * returned relative to the scanned root.
 */
async function listRecursive(
  dir: string,
  prefix = "",
): Promise<{ files: string[]; dirs: string[] }> {
  const files: string[] = [];
  const dirs: string[] = [];

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

// ── IPC handlers ───────────────────────────────────────────────────────────

/**
 * Register all IPC handlers.  Each handler corresponds to one method on
 * window.electronAPI (defined in preload.ts).
 */
function registerIpcHandlers(): void {
  /**
   * Open an OS-native directory picker and return the chosen absolute path,
   * or null if the user cancelled.
   */
  ipcMain.handle("fs:openDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Open Machma Project Folder",
    });
    return result.canceled ? null : result.filePaths[0];
  });

  /**
   * Read a UTF-8 text file at `path.join(root, rel)`.
   * Throws if the file does not exist (caller should handle the error).
   */
  ipcMain.handle("fs:readFile", async (_event, root: string, rel: string) => {
    return fs.readFile(resolvePath(root, rel), "utf-8");
  });

  /**
   * Write UTF-8 content to `path.join(root, rel)`, creating any missing
   * parent directories automatically.
   */
  ipcMain.handle(
    "fs:writeFile",
    async (_event, root: string, rel: string, content: string) => {
      const fullPath = resolvePath(root, rel);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
    },
  );

  /**
   * Delete the file at `path.join(root, rel)`.
   * Throws if the file does not exist.
   */
  ipcMain.handle("fs:deleteFile", async (_event, root: string, rel: string) => {
    await fs.unlink(resolvePath(root, rel));
  });

  /**
   * Recursively list all files and directories under `path.join(root, subPath)`.
   * Returns paths relative to the scanned directory (not to `root`).
   *
   * @param root     - Absolute project root path.
   * @param subPath  - Optional sub-directory to scan (forward-slash separated).
   */
  ipcMain.handle(
    "fs:listDirectory",
    async (_event, root: string, subPath = "") => {
      const scanRoot = subPath ? path.join(root, ...subPath.split("/")) : root;
      try {
        return await listRecursive(scanRoot);
      } catch {
        // Directory does not exist yet
        return { files: [], dirs: [] };
      }
    },
  );

  /**
   * Ensure the directory at `path.join(root, rel)` exists, creating any
   * missing ancestor directories.
   */
  ipcMain.handle("fs:ensureDir", async (_event, root: string, rel: string) => {
    await fs.mkdir(resolvePath(root, rel), { recursive: true });
  });

  /**
   * Return the last-modified timestamp (milliseconds since epoch) of a file.
   * Returns 0 if the file does not exist, so callers can treat 0 as "absent".
   */
  ipcMain.handle(
    "fs:getTimestamp",
    async (_event, root: string, rel: string) => {
      try {
        const stat = await fs.stat(resolvePath(root, rel));
        return stat.mtimeMs;
      } catch {
        return 0;
      }
    },
  );

  /**
   * Check whether a file exists at `path.join(root, rel)`.
   */
  ipcMain.handle("fs:fileExists", async (_event, root: string, rel: string) => {
    try {
      await fs.access(resolvePath(root, rel));
      return true;
    } catch {
      return false;
    }
  });
}
