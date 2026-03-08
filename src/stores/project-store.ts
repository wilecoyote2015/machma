/**
 * Central Zustand store for the entire application state.
 * Holds the loaded project, selected task, filters, and the
 * directory handle for file I/O.
 */

import { create } from "zustand";
import type { Project, Task, TaskGroup, GroupMeta, FilterState, TaskStatus } from "@/types";
import { openProjectDirectory, writeTextFile, writeJsonFile, ensureDirectory } from "@/lib/fs";
import { loadProject } from "@/lib/project-loader";
import { serializeTask } from "@/lib/serializer";

// ── Store shape ────────────────────────────────────────────────────

interface ProjectStore {
  dirHandle: FileSystemDirectoryHandle | null;
  project: Project | null;
  selectedTaskId: string | null;
  activeView: "timeline" | "table" | "helpers" | "entities";
  filters: FilterState;

  // ── Actions ──────────────────────────────────────────────
  openProject: () => Promise<void>;
  reloadProject: () => Promise<void>;
  selectTask: (taskId: string | null) => void;
  setActiveView: (view: "timeline" | "table" | "helpers" | "entities") => void;

  updateTask: (task: Task) => Promise<void>;
  addTask: (group: string, id: string) => Promise<void>;
  deleteTask: (task: Task) => Promise<void>;
  createGroup: (path: string, meta: GroupMeta) => Promise<void>;

  // ── Filter actions ───────────────────────────────────────
  toggleTagFilter: (tag: string) => void;
  toggleGroupFilter: (group: string) => void;
  toggleHelperFilter: (helperId: string) => void;
  toggleStatusFilter: (status: TaskStatus) => void;
  setHasUnresolvedIssues: (value: boolean) => void;
  setHasUnansweredQuestions: (value: boolean) => void;
  setDeadlineWithinDays: (days: number | null) => void;
  clearFilters: () => void;

  saveHelpers: () => Promise<void>;
  saveExternalEntities: () => Promise<void>;
}

const emptyFilters = (): FilterState => ({
  tags: new Set(),
  groups: new Set(),
  helpers: new Set(),
  statuses: new Set(),
  hasUnresolvedIssues: false,
  hasUnansweredQuestions: false,
  deadlineWithinDays: null,
});

// ── Store implementation ───────────────────────────────────────────

export const useProjectStore = create<ProjectStore>((set, get) => ({
  dirHandle: null,
  project: null,
  selectedTaskId: null,
  activeView: "timeline",
  filters: emptyFilters(),

  openProject: async () => {
    const dirHandle = await openProjectDirectory();
    const project = await loadProject(dirHandle);
    set({ dirHandle, project, selectedTaskId: null, filters: emptyFilters() });
  },

  reloadProject: async () => {
    const { dirHandle } = get();
    if (!dirHandle) return;
    const project = await loadProject(dirHandle);
    set({ project });
  },

  selectTask: (taskId) => set({ selectedTaskId: taskId }),

  setActiveView: (view) => set({ activeView: view }),

  updateTask: async (updatedTask) => {
    const { dirHandle, project } = get();
    if (!dirHandle || !project) return;

    const oldTask = project.tasks.find((t) => t.id === updatedTask.id);
    const groupChanged = oldTask && oldTask.group !== updatedTask.group;

    const tasks = project.tasks.map((t) =>
      t.id === updatedTask.id ? updatedTask : t,
    );
    set({ project: { ...project, tasks } });

    try {
      // If group changed, delete the old file first
      if (groupChanged) {
        const tasksDir = await dirHandle.getDirectoryHandle("tasks");
        const oldParts = oldTask.group.split("/");
        let oldGroupDir: FileSystemDirectoryHandle = tasksDir;
        for (const part of oldParts) {
          oldGroupDir = await oldGroupDir.getDirectoryHandle(part);
        }
        await oldGroupDir.removeEntry(`${updatedTask.id}.md`);
      }

      const filePath = `tasks/${updatedTask.group}/${updatedTask.id}.md`;
      await writeTextFile(dirHandle, filePath, serializeTask(updatedTask));
    } catch (e) {
      console.error("[store] Failed to write task file:", e);
    }
  },

  addTask: async (group, id) => {
    const { dirHandle, project } = get();
    if (!dirHandle || !project) return;

    const newTask: Task = {
      id,
      group,
      title: id.replace(/_/g, " "),
      deadline: "",
      assignee: "",
      n_helpers_needed: 0,
      status: "todo",
      depends_on: [],
      tags: [],
      external_entities: [],
      helpers: [],
      description: "",
      questions: [],
      issues: [],
      log: [],
    };

    set({ project: { ...project, tasks: [...project.tasks, newTask] }, selectedTaskId: id });

    try {
      const filePath = `tasks/${group}/${id}.md`;
      await writeTextFile(dirHandle, filePath, serializeTask(newTask));
    } catch (e) {
      console.error("[store] Failed to create task file:", e);
    }
  },

  deleteTask: async (task) => {
    const { dirHandle, project } = get();
    if (!dirHandle || !project) return;

    const tasks = project.tasks.filter((t) => t.id !== task.id);
    const selectedTaskId = get().selectedTaskId === task.id ? null : get().selectedTaskId;
    set({ project: { ...project, tasks }, selectedTaskId });

    try {
      const tasksDir = await dirHandle.getDirectoryHandle("tasks");
      const parts = task.group.split("/");
      let groupDir: FileSystemDirectoryHandle = tasksDir;
      for (const part of parts) {
        groupDir = await groupDir.getDirectoryHandle(part);
      }
      await groupDir.removeEntry(`${task.id}.md`);
    } catch (e) {
      console.error("[store] Failed to delete task file:", e);
    }
  },

  createGroup: async (path, meta) => {
    const { dirHandle, project } = get();
    if (!dirHandle || !project) return;

    const name = path.split("/").pop()!;
    const newGroup: TaskGroup = { path, name, meta };

    set({ project: { ...project, groups: [...project.groups, newGroup] } });

    try {
      // Create the directory tree under tasks/
      const groupDir = await ensureDirectory(dirHandle, `tasks/${path}`);
      // Write group.json with color and description
      const fileHandle = await groupDir.getFileHandle("group.json", { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(meta, null, 4) + "\n");
      await writable.close();
    } catch (e) {
      console.error("[store] Failed to create group directory:", e);
    }
  },

  toggleTagFilter: (tag) =>
    set((s) => {
      const tags = new Set(s.filters.tags);
      if (tags.has(tag)) tags.delete(tag);
      else tags.add(tag);
      return { filters: { ...s.filters, tags } };
    }),

  toggleGroupFilter: (group) =>
    set((s) => {
      const groups = new Set(s.filters.groups);
      if (groups.has(group)) groups.delete(group);
      else groups.add(group);
      return { filters: { ...s.filters, groups } };
    }),

  toggleHelperFilter: (helperId) =>
    set((s) => {
      const helpers = new Set(s.filters.helpers);
      if (helpers.has(helperId)) helpers.delete(helperId);
      else helpers.add(helperId);
      return { filters: { ...s.filters, helpers } };
    }),

  toggleStatusFilter: (status) =>
    set((s) => {
      const statuses = new Set(s.filters.statuses);
      if (statuses.has(status)) statuses.delete(status);
      else statuses.add(status);
      return { filters: { ...s.filters, statuses } };
    }),

  setHasUnresolvedIssues: (value) =>
    set((s) => ({ filters: { ...s.filters, hasUnresolvedIssues: value } })),

  setHasUnansweredQuestions: (value) =>
    set((s) => ({ filters: { ...s.filters, hasUnansweredQuestions: value } })),

  setDeadlineWithinDays: (days) =>
    set((s) => ({ filters: { ...s.filters, deadlineWithinDays: days } })),

  clearFilters: () => set({ filters: emptyFilters() }),

  saveHelpers: async () => {
    const { dirHandle, project } = get();
    if (!dirHandle || !project) return;
    await writeJsonFile(dirHandle, "helpers.json", project.helpers);
  },

  saveExternalEntities: async () => {
    const { dirHandle, project } = get();
    if (!dirHandle || !project) return;
    await writeJsonFile(dirHandle, "external_entities.json", project.external_entities);
  },
}));
