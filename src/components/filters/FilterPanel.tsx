/**
 * Left sidebar filter panel.
 * Provides toggleable filters for tags, groups (tree), helpers, and statuses.
 * Styled with orange background per the mockup.
 */

import { useMemo } from "react";
import { useProjectStore } from "@/stores/project-store";
import type { TaskStatus } from "@/types";

export function FilterPanel() {
  const project = useProjectStore((s) => s.project)!;
  const filters = useProjectStore((s) => s.filters);
  const toggleTag = useProjectStore((s) => s.toggleTagFilter);
  const toggleGroup = useProjectStore((s) => s.toggleGroupFilter);
  const toggleHelper = useProjectStore((s) => s.toggleHelperFilter);
  const toggleStatus = useProjectStore((s) => s.toggleStatusFilter);
  const clearFilters = useProjectStore((s) => s.clearFilters);

  // Collect all unique tags from tasks
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of project.tasks) {
      for (const tag of t.tags) set.add(tag);
    }
    return [...set].sort();
  }, [project.tasks]);

  const allStatuses: TaskStatus[] = ["todo", "in_progress", "finished", "cancelled"];

  const hasActiveFilters =
    filters.tags.size > 0 ||
    filters.groups.size > 0 ||
    filters.helpers.size > 0 ||
    filters.statuses.size > 0;

  return (
    <div className="space-y-5 text-white">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Filter</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-white/70 underline hover:text-white"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Tags ────────────────────────────────────────── */}
      <section>
        <h3 className="mb-1 text-sm font-semibold">Tags</h3>
        <div className="flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                filters.tags.has(tag)
                  ? "bg-white text-orange-600"
                  : "bg-orange-400 text-white hover:bg-orange-300"
              }`}
            >
              {filters.tags.has(tag) && "✓ "}
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* ── Groups ──────────────────────────────────────── */}
      <section>
        <h3 className="mb-1 text-sm font-semibold">Groups</h3>
        <div className="space-y-0.5">
          {project.groups.map((group) => (
            <label
              key={group.path}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-orange-400"
            >
              <input
                type="checkbox"
                checked={filters.groups.size === 0 || filters.groups.has(group.path)}
                onChange={() => toggleGroup(group.path)}
                className="accent-white"
              />
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: group.meta.color }}
              />
              {group.name}
            </label>
          ))}
        </div>
      </section>

      {/* ── Helpers ─────────────────────────────────────── */}
      <section>
        <h3 className="mb-1 text-sm font-semibold">Helpers</h3>
        <div className="space-y-0.5">
          {Object.entries(project.helpers).map(([id, helper]) => (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-orange-400"
            >
              <input
                type="checkbox"
                checked={filters.helpers.size === 0 || filters.helpers.has(id)}
                onChange={() => toggleHelper(id)}
                className="accent-white"
              />
              <span className="rounded bg-green-700 px-1.5 py-0.5 text-xs font-medium">
                {helper.name}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* ── Status ──────────────────────────────────────── */}
      <section>
        <h3 className="mb-1 text-sm font-semibold">Status</h3>
        <div className="flex flex-wrap gap-1">
          {allStatuses.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                filters.statuses.has(status)
                  ? "bg-white text-orange-600"
                  : "bg-orange-400 text-white hover:bg-orange-300"
              }`}
            >
              {filters.statuses.has(status) && "✓ "}
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
