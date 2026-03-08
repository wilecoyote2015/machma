/**
 * Sortable task table view.
 *
 * Columns: title, deadline, assignee, helpers (assigned/needed), status,
 * group (with color indicator), unresolved issues icon, unanswered questions icon.
 *
 * Clicking a row selects the task and shows the detail panel.
 * Sorted by deadline by default; click column headers to change sort.
 */

import { useMemo, useState } from "react";
import type { Task } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { applyFilters } from "@/lib/filters";
import { resolveDeadline, formatDate } from "@/lib/dates";

type SortKey = "title" | "deadline" | "assignee" | "helpers" | "status" | "group";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "group", label: "Group", className: "w-8" },
  { key: "title", label: "Title" },
  { key: "deadline", label: "Deadline", className: "w-28" },
  { key: "assignee", label: "Assignee", className: "w-24" },
  { key: "helpers", label: "Helpers", className: "w-20" },
  { key: "status", label: "Status", className: "w-28" },
];

export function TaskTableView() {
  const project = useProjectStore((s) => s.project)!;
  const filters = useProjectStore((s) => s.filters);
  const selectedTaskId = useProjectStore((s) => s.selectedTaskId);
  const selectTask = useProjectStore((s) => s.selectTask);

  const [sortKey, setSortKey] = useState<SortKey>("deadline");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const anchorDate = project.meta.anchor_date;
  const groupColorMap = useMemo(
    () => new Map(project.groups.map((g) => [g.path, g.meta.color])),
    [project.groups],
  );

  const filteredTasks = useMemo(
    () => applyFilters(project.tasks, filters, anchorDate),
    [project.tasks, filters, anchorDate],
  );

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const compare = (a: Task, b: Task): number => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title);
        case "deadline": {
          const da = resolveDeadline(a.deadline, anchorDate)?.getTime() ?? Infinity;
          const db = resolveDeadline(b.deadline, anchorDate)?.getTime() ?? Infinity;
          return da - db;
        }
        case "assignee":
          return a.assignee.localeCompare(b.assignee);
        case "helpers":
          return a.helpers.length - b.helpers.length;
        case "status":
          return a.status.localeCompare(b.status);
        case "group":
          return a.group.localeCompare(b.group);
      }
    };
    const sorted = [...filteredTasks].sort(compare);
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [filteredTasks, sortKey, sortDir, anchorDate]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="h-full overflow-auto p-4">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`cursor-pointer px-2 py-2 font-semibold text-gray-600 hover:text-gray-800 ${col.className ?? ""}`}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
                )}
              </th>
            ))}
            {/* Icon columns (not sortable) */}
            <th className="w-6 px-1 py-2" title="Unresolved issues">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            </th>
            <th className="w-6 px-1 py-2" title="Unanswered questions">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-400 text-[9px] font-bold text-white">?</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => {
            const resolved = resolveDeadline(task.deadline, anchorDate);
            const hasIssues = task.issues.some((i) => !i.assignee && !i.solution);
            const hasQuestions = task.questions.some((q) => !q.answer.trim());
            const isSelected = task.id === selectedTaskId;
            const groupColor = groupColorMap.get(task.group) ?? "#9CA3AF";

            return (
              <tr
                key={task.id}
                onClick={() => selectTask(isSelected ? null : task.id)}
                className={`cursor-pointer border-b border-gray-100 transition-colors ${
                  isSelected ? "bg-orange-50" : "hover:bg-gray-50"
                }`}
              >
                {/* Group color indicator */}
                <td className="px-2 py-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: groupColor }}
                    title={task.group}
                  />
                </td>

                <td className="px-2 py-2 font-medium text-gray-800">{task.title}</td>

                <td className="px-2 py-2 text-gray-600">
                  {resolved ? formatDate(resolved) : task.deadline || "—"}
                </td>

                <td className="px-2 py-2 text-gray-600">
                  {task.assignee ? (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
                      {task.assignee}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>

                <td className="px-2 py-2 text-gray-600">
                  {task.helpers.length}/{task.n_helpers_needed}
                </td>

                <td className="px-2 py-2">
                  <StatusBadge status={task.status} />
                </td>

                <td className="px-1 py-2 text-center">
                  {hasIssues && (
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" title="Unresolved issues" />
                  )}
                </td>

                <td className="px-1 py-2 text-center">
                  {hasQuestions && (
                    <span
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-400 text-[9px] font-bold text-white"
                      title="Unanswered questions"
                    >
                      ?
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sortedTasks.length === 0 && (
        <p className="mt-8 text-center text-gray-400">No tasks match the current filters</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    todo: "bg-gray-100 text-gray-700",
    in_progress: "bg-yellow-100 text-yellow-800",
    finished: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
