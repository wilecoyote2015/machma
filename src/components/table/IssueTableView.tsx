/**
 * Sortable flat issue table view wrapped in ViewLayout.
 *
 * Flattens all issues from all tasks into rows, with columns:
 * name (issue title), task, group, deadline, task assignee,
 * issue assignee, status (resolved/unresolved), task description.
 *
 * The filter panel and detail panel are issue-specific.
 * Filter state is local (not shared with other views).
 */

import { useMemo, useState } from "react";
import type { Task, TaskIssue } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { resolveDeadline, formatDate } from "@/lib/dates";
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";
import { ViewLayout } from "@/components/common/ViewLayout";
import { IssueFilterPanel, emptyIssueFilters } from "@/components/filters/IssueFilterPanel";
import type { IssueFilterState } from "@/components/filters/IssueFilterPanel";
import { IssueDetail } from "@/components/detail/IssueDetail";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";

// ── Flat row model ──────────────────────────────────────────────────

/** A single flattened issue row joining issue data with its parent task */
interface FlatIssue {
  taskId: string;
  issueIndex: number;
  issue: TaskIssue;
  task: Task;
  resolved: boolean;
  resolvedDeadline: Date | null;
}

// ── Sorting ─────────────────────────────────────────────────────────

type SortKey =
  | "name"
  | "task"
  | "group"
  | "deadline"
  | "taskAssignee"
  | "issueAssignee"
  | "status";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "name", label: "Name", className: "w-44" },
  { key: "task", label: "Task", className: "w-40" },
  { key: "group", label: "Group", className: "w-32" },
  { key: "deadline", label: "Deadline", className: "w-28" },
  { key: "taskAssignee", label: "Task Assignee", className: "w-28" },
  { key: "issueAssignee", label: "Issue Assignee", className: "w-28" },
  { key: "status", label: "Status", className: "w-24" },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ── Component ───────────────────────────────────────────────────────

export function IssueTableView() {
  const project = useProjectStore((s) => s.project)!;
  const anchorDate = project.meta.anchor_date;

  const [filters, setFilters] = useState<IssueFilterState>(emptyIssueFilters);
  const [sortKey, setSortKey] = useState<SortKey>("deadline");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedRef, setSelectedRef] = useState<{ taskId: string; issueIndex: number } | null>(null);

  const groupColorMap = useMemo(
    () => new Map(project.groups.map((g) => [g.path, g.meta.color])),
    [project.groups],
  );

  // ── Flatten all issues across all tasks ────────────────────────
  const allFlatIssues: FlatIssue[] = useMemo(() => {
    const rows: FlatIssue[] = [];
    for (const task of project.tasks) {
      for (let i = 0; i < task.issues.length; i++) {
        const issue = task.issues[i]!;
        rows.push({
          taskId: task.id,
          issueIndex: i,
          issue,
          task,
          resolved: !!issue.solution.trim(),
          resolvedDeadline: resolveDeadline(task.deadline, anchorDate),
        });
      }
    }
    return rows;
  }, [project.tasks, anchorDate]);

  // ── Apply filters ──────────────────────────────────────────────
  const filteredIssues = useMemo(() => {
    const now = Date.now();

    return allFlatIssues.filter((row) => {
      // Issue status
      if (filters.issueStatus === "resolved" && !row.resolved) return false;
      if (filters.issueStatus === "unresolved" && row.resolved) return false;

      // Issue assignee
      if (
        filters.issueAssignees.size > 0 &&
        !filters.issueAssignees.has(row.issue.assignee)
      )
        return false;

      // Task assignee
      if (
        filters.taskAssignees.size > 0 &&
        !filters.taskAssignees.has(row.task.assignee)
      )
        return false;

      // Task group
      if (filters.groups.size > 0 && !filters.groups.has(row.task.group))
        return false;

      // Task deadline proximity
      if (filters.deadlineWithinDays !== null) {
        if (!row.resolvedDeadline) return false;
        const daysUntil = (row.resolvedDeadline.getTime() - now) / MS_PER_DAY;
        if (daysUntil > filters.deadlineWithinDays) return false;
      }

      return true;
    });
  }, [allFlatIssues, filters]);

  // ── Sort ───────────────────────────────────────────────────────
  const sortedIssues = useMemo(() => {
    const compare = (a: FlatIssue, b: FlatIssue): number => {
      switch (sortKey) {
        case "name":
          return a.issue.title.localeCompare(b.issue.title);
        case "task":
          return a.task.title.localeCompare(b.task.title);
        case "group":
          return a.task.group.localeCompare(b.task.group);
        case "deadline": {
          const da = a.resolvedDeadline?.getTime() ?? Infinity;
          const db = b.resolvedDeadline?.getTime() ?? Infinity;
          return da - db;
        }
        case "taskAssignee":
          return a.task.assignee.localeCompare(b.task.assignee);
        case "issueAssignee":
          return a.issue.assignee.localeCompare(b.issue.assignee);
        case "status":
          return Number(a.resolved) - Number(b.resolved);
      }
    };
    const sorted = [...filteredIssues].sort(compare);
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [filteredIssues, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ── Resolve selected issue (re-derive from latest project state) ──
  const selectedTask = selectedRef
    ? project.tasks.find((t) => t.id === selectedRef.taskId) ?? null
    : null;

  const isSelected = (taskId: string, issueIndex: number) =>
    selectedRef?.taskId === taskId && selectedRef?.issueIndex === issueIndex;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <ViewLayout
      filterPanel={<IssueFilterPanel filters={filters} onChange={setFilters} />}
      detailPanel={
        selectedTask && selectedRef ? (
          <IssueDetail
            task={selectedTask}
            issueIndex={selectedRef.issueIndex}
            onClose={() => setSelectedRef(null)}
          />
        ) : null
      }
    >
      <div className="h-full overflow-auto p-4">
        <table className="w-full table-fixed border-collapse text-left text-sm">
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
              <th className="px-2 py-2 font-semibold text-gray-600">Description</th>
            </tr>
          </thead>
          <tbody>
            {sortedIssues.map((row) => {
              const selected = isSelected(row.taskId, row.issueIndex);
              const groupColor = groupColorMap.get(row.task.group) ?? DEFAULT_GROUP_COLOR;

              return (
                <tr
                  key={`${row.taskId}-${row.issueIndex}`}
                  onClick={() =>
                    setSelectedRef(
                      selected ? null : { taskId: row.taskId, issueIndex: row.issueIndex },
                    )
                  }
                  className={`cursor-pointer border-b border-gray-100 transition-colors ${
                    selected ? "bg-primary-subtle" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-2 py-2 font-medium text-gray-800">{row.issue.title}</td>
                  <td className="px-2 py-2 text-gray-700">{row.task.title}</td>
                  <td className="px-2 py-2">
                    <GroupBadge
                      groupPath={row.task.group}
                      color={groupColor}
                      className="text-xs text-gray-600"
                    />
                  </td>
                  <td className="px-2 py-2 text-gray-600">
                    {row.resolvedDeadline ? formatDate(row.resolvedDeadline) : row.task.deadline || "—"}
                  </td>
                  <td className="px-2 py-2">
                    {row.task.assignee ? (
                      <AssigneeBadge label={row.task.assignee} variant="light" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {row.issue.assignee ? (
                      <AssigneeBadge label={row.issue.assignee} variant="light" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        row.resolved
                          ? "bg-success-light text-success-text"
                          : "bg-danger-light text-danger-text"
                      }`}
                    >
                      {row.resolved ? "resolved" : "unresolved"}
                    </span>
                  </td>
                  <td className="max-w-0 truncate px-2 py-2 text-gray-500">
                    {row.task.description || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedIssues.length === 0 && (
          <p className="mt-8 text-center text-gray-400">No issues match the current filters</p>
        )}
      </div>
    </ViewLayout>
  );
}
