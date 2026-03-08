/**
 * Helper List view: shows all tasks that require helpers, with per-task
 * helper management (add/remove helpers, set required count).
 *
 * Each task is rendered as a card with:
 * - Clickable header (group badge, title, deadline, status, fill indicator)
 * - Editable "required helpers" count
 * - Table of assigned helpers with remove buttons
 * - Dropdown to add unassigned helpers
 *
 * Uses shared global filters (FilterPanel) and opens TaskDetail on task click.
 */

import { useMemo, useState, useCallback } from "react";
import type { Task, Helper } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { applyFilters } from "@/lib/filters";
import { resolveDeadline, formatDate } from "@/lib/dates";
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";
import { ViewLayout } from "@/components/common/ViewLayout";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { TaskDetail } from "@/components/detail/TaskDetail";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";

// ── Task Helper Card ──────────────────────────────────────────────

interface TaskHelperCardProps {
  task: Task;
  /** Project helpers map (id → Helper) for resolving names */
  helperMap: Record<string, Helper>;
  groupColor: string;
  anchorDate: string;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateTask: (task: Task) => Promise<void>;
}

/**
 * Card for a single task's helper management.
 * Renders a clickable header, an editable required-helpers count,
 * a table of currently assigned helpers, and an add-helper dropdown.
 */
function TaskHelperCard({
  task,
  helperMap,
  groupColor,
  anchorDate,
  isSelected,
  onSelect,
  onUpdateTask,
}: TaskHelperCardProps) {
  const [addingHelper, setAddingHelper] = useState(false);
  const resolvedDeadline = resolveDeadline(task.deadline, anchorDate);

  /** Helper IDs not yet assigned to this task */
  const availableHelpers = Object.keys(helperMap).filter(
    (id) => !task.helpers.includes(id),
  );

  const isFulfilled = task.helpers.length >= task.n_helpers_needed;

  const handleAddHelper = useCallback(
    (helperId: string) => {
      if (helperId && !task.helpers.includes(helperId)) {
        onUpdateTask({ ...task, helpers: [...task.helpers, helperId] });
      }
      setAddingHelper(false);
    },
    [task, onUpdateTask],
  );

  const handleRemoveHelper = useCallback(
    (helperId: string) => {
      onUpdateTask({ ...task, helpers: task.helpers.filter((h) => h !== helperId) });
    },
    [task, onUpdateTask],
  );

  const handleRequiredChange = useCallback(
    (value: number) => {
      onUpdateTask({ ...task, n_helpers_needed: value });
    },
    [task, onUpdateTask],
  );

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white shadow-sm transition ${
        isSelected ? "ring-2 ring-primary border-primary" : "border-gray-200"
      }`}
    >
      {/* ── Clickable task header ── */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
        onClick={onSelect}
      >
        <GroupBadge groupPath={task.group} color={groupColor} className="text-xs text-gray-600" />
        <span className="font-medium text-gray-800">{task.title}</span>
        <div className="flex-1" />
        {resolvedDeadline && (
          <span className="text-xs text-gray-500">{formatDate(resolvedDeadline)}</span>
        )}
        <StatusBadge status={task.status} />
        {/* Fill indicator: assigned / required */}
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            isFulfilled
              ? "bg-success-light text-success-text"
              : "bg-warning-light text-warning-text"
          }`}
          title={`${task.helpers.length} of ${task.n_helpers_needed} helpers assigned`}
        >
          {task.helpers.length}/{task.n_helpers_needed}
        </span>
      </div>

      {/* ── Content: required count + helper table ── */}
      <div className="border-t border-gray-100 px-4 pb-3 pt-2">
        {/* Editable required helpers count */}
        <div className="mb-2 flex items-center gap-2">
          <label className="text-sm text-gray-600">Required helpers:</label>
          <input
            type="number"
            min={0}
            value={task.n_helpers_needed}
            onChange={(e) => handleRequiredChange(parseInt(e.target.value, 10) || 0)}
            className="input-light w-16 text-center"
          />
        </div>

        {/* Assigned helper table */}
        {task.helpers.length > 0 ? (
          <table className="mb-2 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-1 font-semibold text-gray-600">Helper</th>
                <th className="pb-1 font-semibold text-gray-600">Name</th>
                <th className="w-8 pb-1" />
              </tr>
            </thead>
            <tbody>
              {task.helpers.map((helperId) => {
                const helper = helperMap[helperId];
                return (
                  <tr key={helperId} className="border-b border-gray-50">
                    <td className="py-1.5">
                      <AssigneeBadge label={helperId} variant="light" />
                    </td>
                    <td className="py-1.5 text-gray-700">
                      {helper?.name ?? <span className="italic text-gray-400">Unknown</span>}
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        onClick={() => handleRemoveHelper(helperId)}
                        className="text-gray-400 transition hover:text-danger"
                        title={`Remove ${helper?.name ?? helperId}`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="mb-2 text-xs italic text-gray-400">No helpers assigned</p>
        )}

        {/* Add helper dropdown */}
        {availableHelpers.length > 0 &&
          (addingHelper ? (
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) handleAddHelper(e.target.value);
                }}
                className="input-light flex-1 text-sm"
                autoFocus
              >
                <option value="">Select helper...</option>
                {availableHelpers.map((id) => (
                  <option key={id} value={id}>
                    {id} — {helperMap[id]?.name ?? "Unknown"}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setAddingHelper(false)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingHelper(true)}
              className="text-sm text-primary hover:text-primary-hover"
            >
              + Add helper
            </button>
          ))}
      </div>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────

export function HelperListView() {
  const project = useProjectStore((s) => s.project)!;
  const filters = useProjectStore((s) => s.filters);
  const selectedTaskId = useProjectStore((s) => s.selectedTaskId);
  const selectTask = useProjectStore((s) => s.selectTask);
  const updateTask = useProjectStore((s) => s.updateTask);

  const anchorDate = project.meta.anchor_date;

  const groupColorMap = useMemo(
    () => new Map(project.groups.map((g) => [g.path, g.meta.color])),
    [project.groups],
  );

  /** Tasks filtered by global filters, then narrowed to those needing helpers, sorted by deadline */
  const helperTasks = useMemo(() => {
    const filtered = applyFilters(project.tasks, filters, anchorDate);
    return filtered
      .filter((t) => t.n_helpers_needed > 0 || t.helpers.length > 0)
      .sort((a, b) => {
        const da = resolveDeadline(a.deadline, anchorDate)?.getTime() ?? Infinity;
        const db = resolveDeadline(b.deadline, anchorDate)?.getTime() ?? Infinity;
        return da - db;
      });
  }, [project.tasks, filters, anchorDate]);

  const selectedTask = selectedTaskId
    ? project.tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  return (
    <ViewLayout
      filterPanel={<FilterPanel />}
      detailPanel={selectedTask ? <TaskDetail task={selectedTask} /> : null}
    >
      <div className="h-full overflow-auto p-4">
        {helperTasks.length > 0 ? (
          <div className="space-y-4">
            {helperTasks.map((task) => (
              <TaskHelperCard
                key={task.id}
                task={task}
                helperMap={project.helpers}
                groupColor={groupColorMap.get(task.group) ?? DEFAULT_GROUP_COLOR}
                anchorDate={anchorDate}
                isSelected={task.id === selectedTaskId}
                onSelect={() => selectTask(task.id === selectedTaskId ? null : task.id)}
                onUpdateTask={updateTask}
              />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-center text-gray-400">
            No tasks require helpers (or all are filtered out)
          </p>
        )}
      </div>
    </ViewLayout>
  );
}
