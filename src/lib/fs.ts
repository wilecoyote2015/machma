/**
 * Thin wrapper around the File System Access API.
 * Provides ergonomic helpers for reading/writing project files
 * via a user-selected directory handle.
 */

/** Prompt the user to pick a project directory via the OS file picker. */
export async function openProjectDirectory(): Promise<FileSystemDirectoryHandle> {
  return await window.showDirectoryPicker({ mode: "readwrite" });
}

/**
 * Recursively resolve a nested directory path from a root handle.
 * E.g. resolveDir(root, "tasks/pferd") navigates root -> tasks -> pferd.
 */
async function resolveDir(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemDirectoryHandle> {
  let handle = root;
  for (const segment of path.split("/").filter(Boolean)) {
    handle = await handle.getDirectoryHandle(segment);
  }
  return handle;
}

/** Read a text file relative to a directory handle. */
export async function readTextFile(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<string> {
  const parts = path.split("/");
  const fileName = parts.pop()!;
  const dir = parts.length > 0 ? await resolveDir(root, parts.join("/")) : root;
  const fileHandle = await dir.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return file.text();
}

/** Write a text file relative to a directory handle (creates if missing). */
export async function writeTextFile(
  root: FileSystemDirectoryHandle,
  path: string,
  content: string,
): Promise<void> {
  const parts = path.split("/");
  const fileName = parts.pop()!;
  const dir = parts.length > 0 ? await resolveDir(root, parts.join("/")) : root;
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/** Read and parse a JSON file relative to a directory handle. */
export async function readJsonFile<T>(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<T> {
  const text = await readTextFile(root, path);
  return JSON.parse(text) as T;
}

/** Write an object as formatted JSON to a file. */
export async function writeJsonFile(
  root: FileSystemDirectoryHandle,
  path: string,
  data: unknown,
): Promise<void> {
  await writeTextFile(root, path, JSON.stringify(data, null, 4) + "\n");
}

/** Check whether a file exists in the directory. */
export async function fileExists(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<boolean> {
  try {
    await readTextFile(root, path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the lastModified timestamp (ms since epoch) for a file.
 * Returns 0 if the file doesn't exist.
 */
export async function getFileTimestamp(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<number> {
  try {
    const parts = path.split("/");
    const fileName = parts.pop()!;
    const dir = parts.length > 0 ? await resolveDir(root, parts.join("/")) : root;
    const fileHandle = await dir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return file.lastModified;
  } catch {
    return 0;
  }
}

/**
 * Recursively list all entries in a directory, returning
 * { files: string[], dirs: string[] } with paths relative to root.
 */
export async function listDirectoryRecursive(
  root: FileSystemDirectoryHandle,
  prefix = "",
): Promise<{ files: string[]; dirs: string[] }> {
  const files: string[] = [];
  const dirs: string[] = [];

  for await (const [name, handle] of root.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "file") {
      files.push(path);
    } else {
      dirs.push(path);
      const sub = await listDirectoryRecursive(
        handle as FileSystemDirectoryHandle,
        path,
      );
      files.push(...sub.files);
      dirs.push(...sub.dirs);
    }
  }

  return { files, dirs };
}
