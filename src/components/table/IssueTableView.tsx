/**
 * Sortable flat issue table view wrapped in ViewLayout.
 *
 * Flattens all issues from all tasks into rows. Uses SortableTable
 * for table rendering, IssueFilterPanel for filtering, and
 * IssueDetail for the right panel.
 *
 * Filter state is local (not shared with other views).
 */

import { useMemo, useState } from "react";
import type { Task, TaskIssue } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { resolveDeadline, formatDate } from "@/lib/dates";
import { getInitials } from "@/lib/format";
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";
import { ViewLayout } from "@/components/common/ViewLayout";
import { SortableTable, type Column } from "@/components/common/SortableTable";
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
  groupColor: string;
  /** Pre-resolved task assignee display label (initials or raw ID fallback) */
  taskAssigneeLabel: string;
  /** Pre-resolved issue assignee display label (initials or raw ID fallback) */
  issueAssigneeLabel: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ── Component ───────────────────────────────────────────────────────

export function IssueTableView() {
  const project = useProjectStore((s) => s.project)!;
  const anchorDate = project.meta.anchor_date;

  const [filters, setFilters] = useState<IssueFilterState>(emptyIssueFilters);
  const [selectedRef, setSelectedRef] = useState<{ taskId: string; issueIndex: number } | null>(null);

  const groupColorMap = useMemo(
    () => new Map(project.groups.map((g) => [g.path, g.meta.color])),
    [project.groups],
  );

  // ── Flatten → filter ───────────────────────────────────────────
  const rows: FlatIssue[] = useMemo(() => {
    const now = Date.now();
    const flat: FlatIssue[] = [];

    for (const task of project.tasks) {
      for (let i = 0; i < task.issues.length; i++) {
        const issue = task.issues[i]!;
        const resolved = !!issue.solution.trim();
        const resolvedDeadline = resolveDeadline(task.deadline, anchorDate);

        // Apply filters inline during flattening for efficiency
        if (filters.issueStatus === "resolved" && !resolved) continue;
        if (filters.issueStatus === "unresolved" && resolved) continue;
        if (filters.issueAssignees.size > 0 && !filters.issueAssignees.has(issue.assignee)) continue;
        if (filters.taskAssignees.size > 0 && !filters.taskAssignees.has(task.assignee)) continue;
        if (filters.groups.size > 0 && !filters.groups.has(task.group)) continue;
        if (filters.deadlineWithinDays !== null) {
          if (!resolvedDeadline) continue;
          if ((resolvedDeadline.getTime() - now) / MS_PER_DAY > filters.deadlineWithinDays) continue;
        }

        const taskHelper = project.helpers[task.assignee];
        const issueHelper = issue.assignee ? project.helpers[issue.assignee] : undefined;

        flat.push({
          taskId: task.id,
          issueIndex: i,
          issue,
          task,
          resolved,
          resolvedDeadline,
          groupColor: groupColorMap.get(task.group) ?? DEFAULT_GROUP_COLOR,
          taskAssigneeLabel: taskHelper ? getInitials(taskHelper.name) : task.assignee,
          issueAssigneeLabel: issueHelper ? getInitials(issueHelper.name) : issue.assignee,
        });
      }
    }
    return flat;
  }, [project.tasks, anchorDate, filters, groupColorMap]);

  // ── Column definitions ─────────────────────────────────────────
  const columns: Column<FlatIssue>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        thClassName: "w-44",
        cellClassName: "px-2 py-2 font-medium text-gray-800",
        compare: (a, b) => a.issue.title.localeCompare(b.issue.title),
        render: (r) => r.issue.title,
      },
      {
        key: "task",
        label: "Task",
        thClassName: "w-40",
        cellClassName: "px-2 py-2 text-gray-700",
        compare: (a, b) => a.task.title.localeCompare(b.task.title),
        render: (r) => r.task.title,
      },
      {
        key: "group",
        label: "Group",
        thClassName: "w-32",
        compare: (a, b) => a.task.group.localeCompare(b.task.group),
        render: (r) => (
          <GroupBadge groupPath={r.task.group} color={r.groupColor} className="text-xs text-gray-600" />
        ),
      },
      {
        key: "deadline",
        label: "Deadline",
        thClassName: "w-28",
        cellClassName: "px-2 py-2 text-gray-600",
        compare: (a, b) =>
          (a.resolvedDeadline?.getTime() ?? Infinity) - (b.resolvedDeadline?.getTime() ?? Infinity),
        render: (r) =>
          r.resolvedDeadline ? formatDate(r.resolvedDeadline) : r.task.deadline || "—",
      },
      {
        key: "taskAssignee",
        label: "Task Assignee",
        thClassName: "w-28",
        compare: (a, b) => a.taskAssigneeLabel.localeCompare(b.taskAssigneeLabel),
        render: (r) =>
          r.taskAssigneeLabel ? <AssigneeBadge label={r.taskAssigneeLabel} variant="light" /> : "—",
      },
      {
        key: "issueAssignee",
        label: "Issue Assignee",
        thClassName: "w-28",
        compare: (a, b) => a.issueAssigneeLabel.localeCompare(b.issueAssigneeLabel),
        render: (r) =>
          r.issueAssigneeLabel ? <AssigneeBadge label={r.issueAssigneeLabel} variant="light" /> : "—",
      },
      {
        key: "status",
        label: "Status",
        thClassName: "w-24",
        compare: (a, b) => Number(a.resolved) - Number(b.resolved),
        render: (r) => (
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              r.resolved ? "bg-success-light text-success-text" : "bg-danger-light text-danger-text"
            }`}
          >
            {r.resolved ? "resolved" : "unresolved"}
          </span>
        ),
      },
      {
        key: "description",
        label: "Description",
        cellClassName: "max-w-0 truncate px-2 py-2 text-gray-500",
        render: (r) => r.task.description || "—",
      },
    ],
    [],
  );

  // ── Selection ──────────────────────────────────────────────────
  const selectedTask = selectedRef
    ? project.tasks.find((t) => t.id === selectedRef.taskId) ?? null
    : null;

  const selectedRowKey = selectedRef
    ? `${selectedRef.taskId}-${selectedRef.issueIndex}`
    : null;

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
      <SortableTable
        columns={columns}
        data={rows}
        rowKey={(r) => `${r.taskId}-${r.issueIndex}`}
        defaultSortKey="deadline"
        selectedRowKey={selectedRowKey}
        onRowClick={(r) =>
          setSelectedRef(
            selectedRef?.taskId === r.taskId && selectedRef?.issueIndex === r.issueIndex
              ? null
              : { taskId: r.taskId, issueIndex: r.issueIndex },
          )
        }
        emptyMessage="No issues match the current filters"
      />
    </ViewLayout>
  );
}
