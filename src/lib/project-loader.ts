/**
 * Recursively reads a project directory and assembles the full in-memory
 * Project model.
 *
 * All file I/O goes through `src/lib/fs.ts`, which delegates to the Electron
 * IPC bridge (window.electronAPI).  The `root` parameter is now a plain
 * string (absolute directory path) instead of a FileSystemDirectoryHandle.
 */

import type {
  Project,
  ProjectMeta,
  Helper,
  ExternalEntity,
  TaskGroup,
  GroupMeta,
  Task,
} from "@/types";
import { readJsonFile, readTextFile, listDirectoryRecursive } from "@/lib/fs";
import { parseTask } from "@/lib/parser";
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";

const DEFAULT_GROUP_META: GroupMeta = {
  color: DEFAULT_GROUP_COLOR,
  description: "",
};

/**
 * Load an entire project from a directory path.
 *
 * Reads `project.json`, `helpers.json`, `external_entities.json`,
 * and recursively walks `tasks/` for group directories and task `.md` files.
 *
 * @param root - Absolute path to the project directory.
 */
export async function loadProject(root: string): Promise<Project> {
  // Read top-level JSON files in parallel.
  const [meta, helpers, externalEntities] = await Promise.all([
    readJsonFile<ProjectMeta>(root, "project.json"),
    readJsonFile<Record<string, Helper>>(root, "helpers.json"),
    readJsonFile<Record<string, ExternalEntity>>(
      root,
      "external_entities.json",
    ),
  ]);

  // List everything under tasks/ (returns empty when the directory is absent).
  const { files, dirs } = await listDirectoryRecursive(root, "tasks");

  if (files.length === 0 && dirs.length === 0) {
    // No tasks directory yet — return an empty project.
    return {
      meta,
      helpers,
      external_entities: externalEntities,
      groups: [],
      tasks: [],
    };
  }

  // Build groups from every sub-directory found under tasks/.
  const groups: TaskGroup[] = [];
  for (const dirPath of dirs) {
    const name = dirPath.split("/").pop()!;
    let groupMeta = { ...DEFAULT_GROUP_META };
    if (files.includes(`${dirPath}/group.json`)) {
      try {
        // group.json paths are relative to tasks/, so prefix accordingly.
        const parsed = await readJsonFile<Partial<GroupMeta>>(
          root,
          `tasks/${dirPath}/group.json`,
        );
        groupMeta = { ...DEFAULT_GROUP_META, ...parsed };
      } catch {
        // Malformed group.json — fall back to defaults.
      }
    }
    groups.push({ path: dirPath, name, meta: groupMeta });
  }

  // Parse all .md files as tasks.
  const tasks: Task[] = [];
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  for (const filePath of mdFiles) {
    // Task file paths are relative to tasks/, so prefix accordingly.
    const content = await readTextFile(root, `tasks/${filePath}`);
    const id = filePath.split("/").pop()!.replace(/\.md$/, "");
    // Group path = directory portion of the relative file path.
    const group = filePath.split("/").slice(0, -1).join("/");
    tasks.push(parseTask(content, id, group));
  }

  return { meta, helpers, external_entities: externalEntities, groups, tasks };
}
