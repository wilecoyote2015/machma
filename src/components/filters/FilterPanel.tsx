/**
 * Left sidebar filter panel.
 * Provides toggleable filters for tags, groups, helpers, statuses,
 * issue/question flags, and deadline proximity.
 */

import { useMemo } from "react";
import { useProjectStore } from "@/stores/project-store";
import type { TaskStatus } from "@/types";

const DEADLINE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "All", value: null },
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export function FilterPanel() {
  const project = useProjectStore((s) => s.project)!;
  const filters = useProjectStore((s) => s.filters);
  const toggleTag = useProjectStore((s) => s.toggleTagFilter);
  const toggleGroup = useProjectStore((s) => s.toggleGroupFilter);
  const toggleHelper = useProjectStore((s) => s.toggleHelperFilter);
  const toggleStatus = useProjectStore((s) => s.toggleStatusFilter);
  const setHasUnresolvedIssues = useProjectStore((s) => s.setHasUnresolvedIssues);
  const setHasUnansweredQuestions = useProjectStore((s) => s.setHasUnansweredQuestions);
  const setDeadlineWithinDays = useProjectStore((s) => s.setDeadlineWithinDays);
  const clearFilters = useProjectStore((s) => s.clearFilters);

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
    filters.statuses.size > 0 ||
    filters.hasUnresolvedIssues ||
    filters.hasUnansweredQuestions ||
    filters.deadlineWithinDays !== null;

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

      {/* ── Deadline proximity ──────────────────────────── */}
      <section>
        <h3 className="mb-1 text-sm font-semibold">Deadline within</h3>
        <div className="flex flex-wrap gap-1">
          {DEADLINE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setDeadlineWithinDays(opt.value)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                filters.deadlineWithinDays === opt.value
                  ? "bg-white text-orange-600"
                  : "bg-orange-400 text-white hover:bg-orange-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Flags ───────────────────────────────────────── */}
      <section>
        <h3 className="mb-1 text-sm font-semibold">Flags</h3>
        <div className="space-y-1">
          <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-orange-400">
            <input
              type="checkbox"
              checked={filters.hasUnresolvedIssues}
              onChange={(e) => setHasUnresolvedIssues(e.target.checked)}
              className="accent-white"
            />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            Has unresolved issues
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-orange-400">
            <input
              type="checkbox"
              checked={filters.hasUnansweredQuestions}
              onChange={(e) => setHasUnansweredQuestions(e.target.checked)}
              className="accent-white"
            />
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-400 text-[9px] font-bold">?</span>
            Has unanswered questions
          </label>
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
    </div>
  );
}
