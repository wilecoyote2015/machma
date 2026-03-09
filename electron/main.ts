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

// ── Recent-projects persistence ───────────────────────────────────────────

/** One entry in the recently-opened projects list. */
interface RecentProject {
  /** Absolute path to the project directory. */
  path: string;
  /** Human-readable name from project.json. */
  name: string;
  /** Unix timestamp (ms) when the project was last opened. */
  openedAt: number;
}

/** Maximum number of recent projects to retain. */
const MAX_RECENT = 5;

/** Absolute path to the file that stores the recent-projects list. */
function recentProjectsFile(): string {
  return path.join(app.getPath("userData"), "recent-projects.json");
}

/** Load the current recent-projects list from disk (returns [] on any error). */
async function loadRecentProjects(): Promise<RecentProject[]> {
  try {
    const raw = await fs.readFile(recentProjectsFile(), "utf-8");
    return JSON.parse(raw) as RecentProject[];
  } catch {
    return [];
  }
}

/**
 * Prepend `entry` to the recent-projects list, deduplicate by path,
 * keep only the newest `MAX_RECENT` entries, then persist to disk.
 */
async function saveRecentProject(entry: RecentProject): Promise<void> {
  const existing = await loadRecentProjects();
  // Remove any previous entry for the same path so it bubbles to the top.
  const deduped = existing.filter((e) => e.path !== entry.path);
  const updated = [entry, ...deduped].slice(0, MAX_RECENT);
  await fs.writeFile(recentProjectsFile(), JSON.stringify(updated, null, 2), "utf-8");
}

// Forge Vite plugin injects these globals at build time:
//   MAIN_WINDOW_VITE_DEV_SERVER_URL – dev server URL (undefined in production)
//   MAIN_WINDOW_VITE_NAME           – renderer entry name (for production path)
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// ── Window ────────────────────────────────────────────────────────────────

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    // The app ships its own nav bar, so the native OS menu bar is hidden.
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

// ── App lifecycle ─────────────────────────────────────────────────────────

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  // macOS: re-create the window when the dock icon is clicked and no windows are open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit on all windows closed (except macOS where the app stays alive).
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Build an absolute native path from a project root and a forward-slash
 * separated relative path.  path.join normalises separators for the current OS.
 */
function resolvePath(root: string, rel: string): string {
  return path.join(root, rel);
}

/**
 * Recursively walk a directory and collect all file and sub-directory paths
 * relative to the scanned root.
 */
async function listRecursive(
  dir: string,
  prefix = "",
): Promise<{ files: string[]; dirs: string[] }> {
  const files: string[] = [];
  const dirs: string[] = [];

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

// ── IPC handlers ──────────────────────────────────────────────────────────

/**
 * Register all IPC handlers.  Each channel maps to one method on
 * window.electronAPI (preload.ts) whose types are declared in vite-env.d.ts.
 */
function registerIpcHandlers(): void {
  ipcMain.handle("fs:openDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Open Machma Project Folder",
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("fs:readFile", (_event, root: string, rel: string) =>
    fs.readFile(resolvePath(root, rel), "utf-8"),
  );

  ipcMain.handle(
    "fs:writeFile",
    async (_event, root: string, rel: string, content: string) => {
      const fullPath = resolvePath(root, rel);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
    },
  );

  ipcMain.handle("fs:deleteFile", (_event, root: string, rel: string) =>
    fs.unlink(resolvePath(root, rel)),
  );

  ipcMain.handle(
    "fs:listDirectory",
    async (_event, root: string, subPath?: string) => {
      try {
        return await listRecursive(subPath ? resolvePath(root, subPath) : root);
      } catch {
        return { files: [], dirs: [] }; // directory does not exist yet
      }
    },
  );

  ipcMain.handle("fs:ensureDir", (_event, root: string, rel: string) =>
    fs.mkdir(resolvePath(root, rel), { recursive: true }),
  );

  ipcMain.handle(
    "fs:getTimestamp",
    async (_event, root: string, rel: string) => {
      try {
        return (await fs.stat(resolvePath(root, rel))).mtimeMs;
      } catch {
        return 0;
      }
    },
  );

  ipcMain.handle("fs:fileExists", async (_event, root: string, rel: string) => {
    try {
      await fs.access(resolvePath(root, rel));
      return true;
    } catch {
      return false;
    }
  });

  /** Return the list of recently opened projects (newest first). */
  ipcMain.handle("app:getRecentProjects", () => loadRecentProjects());

  /** Add or update an entry in the recent-projects list and persist it. */
  ipcMain.handle(
    "app:pushRecentProject",
    (_event, entry: RecentProject) => saveRecentProject(entry),
  );
}
