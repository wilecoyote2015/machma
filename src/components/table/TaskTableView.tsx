/**
 * Sortable task table view wrapped in ViewLayout.
 * Shares the same filter panel and task detail panel as the timeline.
 */

import { useMemo, useState } from "react";
import type { Task } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { applyFilters } from "@/lib/filters";
import { resolveDeadline, formatDate } from "@/lib/dates";
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";
import { ViewLayout } from "@/components/common/ViewLayout";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { TaskDetail } from "@/components/detail/TaskDetail";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { IssueIndicator } from "@/components/ui/IssueIndicator";
import { QuestionIndicator } from "@/components/ui/QuestionIndicator";

type SortKey = "title" | "deadline" | "assignee" | "helpers" | "status" | "group";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "group", label: "Group", className: "w-36" },
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

  const selectedTask = selectedTaskId
    ? project.tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  return (
    <ViewLayout
      filterPanel={<FilterPanel />}
      detailPanel={selectedTask ? <TaskDetail task={selectedTask} /> : null}
    >
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
              <th className="w-6 px-1 py-2"><IssueIndicator /></th>
              <th className="w-6 px-1 py-2"><QuestionIndicator /></th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const resolved = resolveDeadline(task.deadline, anchorDate);
              const hasIssues = task.issues.some((i) => !i.assignee && !i.solution);
              const hasQuestions = task.questions.some((q) => !q.answer.trim());
              const isSelected = task.id === selectedTaskId;
              const groupColor = groupColorMap.get(task.group) ?? DEFAULT_GROUP_COLOR;

              return (
                <tr
                  key={task.id}
                  onClick={() => selectTask(isSelected ? null : task.id)}
                  className={`cursor-pointer border-b border-gray-100 transition-colors ${
                    isSelected ? "bg-primary-subtle" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-2 py-2">
                    <GroupBadge groupPath={task.group} color={groupColor} className="text-gray-600 text-xs" />
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-800">{task.title}</td>
                  <td className="px-2 py-2 text-gray-600">
                    {resolved ? formatDate(resolved) : task.deadline || "—"}
                  </td>
                  <td className="px-2 py-2">
                    {task.assignee ? <AssigneeBadge label={task.assignee} variant="light" /> : "—"}
                  </td>
                  <td className="px-2 py-2 text-gray-600">
                    {task.helpers.length}/{task.n_helpers_needed}
                  </td>
                  <td className="px-2 py-2"><StatusBadge status={task.status} /></td>
                  <td className="px-1 py-2 text-center">{hasIssues && <IssueIndicator />}</td>
                  <td className="px-1 py-2 text-center">{hasQuestions && <QuestionIndicator />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedTasks.length === 0 && (
          <p className="mt-8 text-center text-gray-400">No tasks match the current filters</p>
        )}
      </div>
    </ViewLayout>
  );
}
