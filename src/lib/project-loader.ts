/**
 * Recursively reads a project directory via the File System Access API
 * and assembles the full in-memory Project model.
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
 * Load an entire project from a directory handle.
 * Reads project.json, helpers.json, external_entities.json,
 * and recursively walks tasks/ for groups and task .md files.
 */
export async function loadProject(
  root: FileSystemDirectoryHandle,
): Promise<Project> {
  // Read top-level JSON files
  const [meta, helpers, externalEntities] = await Promise.all([
    readJsonFile<ProjectMeta>(root, "project.json"),
    readJsonFile<Record<string, Helper>>(root, "helpers.json"),
    readJsonFile<Record<string, ExternalEntity>>(root, "external_entities.json"),
  ]);

  // Recursively list everything under tasks/
  let tasksDir: FileSystemDirectoryHandle;
  try {
    tasksDir = await root.getDirectoryHandle("tasks");
  } catch {
    // No tasks directory yet — return empty project
    return { meta, helpers, external_entities: externalEntities, groups: [], tasks: [] };
  }

  const { files, dirs } = await listDirectoryRecursive(tasksDir);

  // Build groups from directories that contain a group.json (or all dirs as implicit groups)
  const groups: TaskGroup[] = [];
  for (const dirPath of dirs) {
    const name = dirPath.split("/").pop()!;
    let groupMeta = { ...DEFAULT_GROUP_META };
    if (files.includes(`${dirPath}/group.json`)) {
      try {
        const parsed = await readJsonFile<Partial<GroupMeta>>(tasksDir, `${dirPath}/group.json`);
        groupMeta = { ...DEFAULT_GROUP_META, ...parsed };
      } catch {
        // Malformed group.json — use defaults
      }
    }
    groups.push({ path: dirPath, name, meta: groupMeta });
  }

  // Parse all .md files as tasks
  const tasks: Task[] = [];
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  for (const filePath of mdFiles) {
    const content = await readTextFile(tasksDir, filePath);
    const id = filePath.split("/").pop()!.replace(/\.md$/, "");
    // Group path = directory portion of the file path
    const group = filePath.split("/").slice(0, -1).join("/");
    tasks.push(parseTask(content, id, group));
  }

  return { meta, helpers, external_entities: externalEntities, groups, tasks };
}
