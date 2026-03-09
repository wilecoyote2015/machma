/**
 * File system abstraction for the Electron renderer process.
 *
 * All functions delegate to `window.electronAPI`, which is exposed by the
 * preload script (electron/preload.ts) via contextBridge.  The main process
 * (electron/main.ts) executes the actual Node.js fs/promises calls.
 *
 * The API mirrors the old browser File System Access API wrapper so all
 * callers require only a single type change: `FileSystemDirectoryHandle` → `string`
 * (an absolute directory path returned by openProjectDirectory).
 */

/** Prompt the user to pick a project directory via the OS-native file dialog. */
export function openProjectDirectory(): Promise<string> {
  return window.electronAPI.openDirectory().then((chosen) => {
    if (!chosen) throw new Error("No directory selected.");
    return chosen;
  });
}

/** Read a UTF-8 text file at `rel` inside the project root `root`. */
export function readTextFile(root: string, rel: string): Promise<string> {
  return window.electronAPI.readFile(root, rel);
}

/**
 * Write UTF-8 `content` to `rel` inside `root`.
 * Missing parent directories are created automatically.
 */
export function writeTextFile(
  root: string,
  rel: string,
  content: string,
): Promise<void> {
  return window.electronAPI.writeFile(root, rel, content);
}

/** Read and parse a JSON file relative to the project root. */
export async function readJsonFile<T>(root: string, rel: string): Promise<T> {
  return JSON.parse(await readTextFile(root, rel)) as T;
}

/** Serialise `data` to formatted JSON and write it to `rel` inside `root`. */
export function writeJsonFile(
  root: string,
  rel: string,
  data: unknown,
): Promise<void> {
  return writeTextFile(root, rel, JSON.stringify(data, null, 4) + "\n");
}

/** Delete the file at `rel` inside `root`. */
export function deleteFile(root: string, rel: string): Promise<void> {
  return window.electronAPI.deleteFile(root, rel);
}

/** Check whether a file exists at `rel` inside `root`. */
export function fileExists(root: string, rel: string): Promise<boolean> {
  return window.electronAPI.fileExists(root, rel);
}

/**
 * Return the last-modified timestamp (ms since epoch) of a file.
 * Returns 0 if the file does not exist.
 */
export function getFileTimestamp(root: string, rel: string): Promise<number> {
  return window.electronAPI.getTimestamp(root, rel);
}

/**
 * Ensure the directory at `rel` inside `root` exists, creating any
 * missing ancestor directories.
 */
export function ensureDirectory(root: string, rel: string): Promise<void> {
  return window.electronAPI.ensureDirectory(root, rel);
}

/**
 * Recursively list all entries under `subPath` inside `root`.
 * Returns `{ files, dirs }` with paths relative to the scanned sub-directory.
 * When `subPath` is omitted the entire `root` is scanned.
 */
export function listDirectoryRecursive(
  root: string,
  subPath?: string,
): Promise<{ files: string[]; dirs: string[] }> {
  return window.electronAPI.listDirectory(root, subPath);
}
