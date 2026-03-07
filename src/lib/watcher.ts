/**
 * File change detection via polling.
 *
 * Tracks lastModified timestamps of all project files
 * and triggers a reload when external changes are detected.
 */

import { listDirectoryRecursive, getFileTimestamp } from "@/lib/fs";

/** Snapshot of file timestamps for the entire project directory. */
export type TimestampSnapshot = Map<string, number>;

/**
 * Build a snapshot of all file timestamps under the project root.
 * Includes project.json, helpers.json, external_entities.json,
 * and everything under tasks/.
 */
export async function buildSnapshot(
  root: FileSystemDirectoryHandle,
): Promise<TimestampSnapshot> {
  const snapshot: TimestampSnapshot = new Map();

  // Top-level JSON files
  for (const file of ["project.json", "helpers.json", "external_entities.json"]) {
    const ts = await getFileTimestamp(root, file);
    if (ts > 0) snapshot.set(file, ts);
  }

  // All files under tasks/
  try {
    const tasksDir = await root.getDirectoryHandle("tasks");
    const { files } = await listDirectoryRecursive(tasksDir);
    for (const file of files) {
      const path = `tasks/${file}`;
      const ts = await getFileTimestamp(root, path);
      if (ts > 0) snapshot.set(path, ts);
    }
  } catch {
    // tasks/ directory may not exist yet
  }

  return snapshot;
}

/**
 * Compare two snapshots and return paths that have changed
 * (modified, added, or deleted).
 */
export function diffSnapshots(
  prev: TimestampSnapshot,
  next: TimestampSnapshot,
): string[] {
  const changed: string[] = [];

  // Check for modified or new files
  for (const [path, ts] of next) {
    if (prev.get(path) !== ts) {
      changed.push(path);
    }
  }

  // Check for deleted files
  for (const path of prev.keys()) {
    if (!next.has(path)) {
      changed.push(path);
    }
  }

  return changed;
}
