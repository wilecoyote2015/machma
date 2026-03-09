/**
 * File system abstraction for the Electron renderer process.
 *
 * All functions delegate to `window.electronAPI`, which is exposed by the
 * preload script (electron/preload.ts) via Electron's contextBridge.
 * The main process (electron/main.ts) executes the actual Node.js fs calls.
 *
 * The public API mirrors the old File System Access API wrapper so that all
 * callers (project-loader, project-store, watcher) need only a single type
 * change: `FileSystemDirectoryHandle` → `string` (an absolute directory path).
 */

/** Prompt the user to pick a project directory via the OS-native file dialog. */
export async function openProjectDirectory(): Promise<string> {
  const chosen = await window.electronAPI.openDirectory();
  if (!chosen) throw new Error("No directory selected.");
  return chosen;
}

/** Read a UTF-8 text file at `rel` inside the project root `root`. */
export async function readTextFile(root: string, path: string): Promise<string> {
  return window.electronAPI.readFile(root, path);
}

/**
 * Write UTF-8 `content` to `rel` inside the project root `root`.
 * Missing parent directories are created automatically.
 */
export async function writeTextFile(
  root: string,
  path: string,
  content: string,
): Promise<void> {
  return window.electronAPI.writeFile(root, path, content);
}

/** Read and parse a JSON file relative to the project root. */
export async function readJsonFile<T>(root: string, path: string): Promise<T> {
  const text = await readTextFile(root, path);
  return JSON.parse(text) as T;
}

/** Serialise `data` to formatted JSON and write it to `rel` inside `root`. */
export async function writeJsonFile(
  root: string,
  path: string,
  data: unknown,
): Promise<void> {
  await writeTextFile(root, path, JSON.stringify(data, null, 4) + "\n");
}

/** Delete the file at `rel` inside the project root `root`. */
export async function deleteFile(root: string, path: string): Promise<void> {
  return window.electronAPI.deleteFile(root, path);
}

/** Check whether a file exists at `rel` inside the project root `root`. */
export async function fileExists(root: string, path: string): Promise<boolean> {
  return window.electronAPI.fileExists(root, path);
}

/**
 * Return the last-modified timestamp (ms since epoch) of a file.
 * Returns 0 if the file does not exist.
 */
export async function getFileTimestamp(
  root: string,
  path: string,
): Promise<number> {
  return window.electronAPI.getTimestamp(root, path);
}

/**
 * Ensure the directory at `rel` inside `root` exists, creating any missing
 * ancestor directories.
 */
export async function ensureDirectory(root: string, rel: string): Promise<void> {
  return window.electronAPI.ensureDirectory(root, rel);
}

/**
 * Recursively list all entries under `subPath` inside `root`.
 * Returns `{ files, dirs }` with paths relative to the scanned sub-directory.
 *
 * @param root    - Absolute project root path.
 * @param subPath - Optional sub-directory to scan (forward-slash separated).
 *                  When omitted, the entire `root` is scanned.
 */
export async function listDirectoryRecursive(
  root: string,
  subPath?: string,
): Promise<{ files: string[]; dirs: string[] }> {
  return window.electronAPI.listDirectory(root, subPath);
}
