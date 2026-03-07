/**
 * Central Zustand store for the entire application state.
 * Holds the loaded project, selected task, filters, and the
 * directory handle for file I/O.
 */

import { create } from "zustand";
import type { Project, Task, FilterState, TaskStatus } from "@/types";
import { openProjectDirectory, writeTextFile, writeJsonFile } from "@/lib/fs";
import { loadProject } from "@/lib/project-loader";
import { serializeTask } from "@/lib/serializer";

// ── Store shape ────────────────────────────────────────────────────

interface ProjectStore {
  /** The directory handle for the open project (null if none open) */
  dirHandle: FileSystemDirectoryHandle | null;
  /** The loaded project data (null if no project open) */
  project: Project | null;
  /** ID of the currently selected task */
  selectedTaskId: string | null;
  /** Current active view/tab */
  activeView: "timeline" | "helpers" | "entities";
  /** Filter state for the timeline */
  filters: FilterState;

  // ── Actions ──────────────────────────────────────────────
  openProject: () => Promise<void>;
  reloadProject: () => Promise<void>;
  selectTask: (taskId: string | null) => void;
  setActiveView: (view: "timeline" | "helpers" | "entities") => void;

  /** Update a task in the store and persist to disk */
  updateTask: (task: Task) => Promise<void>;

  // ── Filter actions ───────────────────────────────────────
  toggleTagFilter: (tag: string) => void;
  toggleGroupFilter: (group: string) => void;
  toggleHelperFilter: (helperId: string) => void;
  toggleStatusFilter: (status: TaskStatus) => void;
  clearFilters: () => void;

  /** Update helpers.json on disk */
  saveHelpers: () => Promise<void>;
  /** Update external_entities.json on disk */
  saveExternalEntities: () => Promise<void>;
}

const emptyFilters = (): FilterState => ({
  tags: new Set(),
  groups: new Set(),
  helpers: new Set(),
  statuses: new Set(),
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

    // Update in-memory state
    const tasks = project.tasks.map((t) =>
      t.id === updatedTask.id ? updatedTask : t,
    );
    set({ project: { ...project, tasks } });

    // Persist to disk
    const filePath = `tasks/${updatedTask.group}/${updatedTask.id}.md`;
    await writeTextFile(dirHandle, filePath, serializeTask(updatedTask));
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
