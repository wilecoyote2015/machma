/**
 * Sortable task table view wrapped in ViewLayout.
 * Shares the same filter panel and task detail panel as the timeline.
 */

import { useMemo } from "react";
import type { Task, TaskStatus } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { applyFilters } from "@/lib/filters";
import { resolveDeadline, resolveStartDate, formatDate, formatDateTime } from "@/lib/dates";
import { getInitials } from "@/lib/format";
import { DEFAULT_GROUP_COLOR, TASK_STATUSES, formatStatus } from "@/lib/constants";
import { ViewLayout } from "@/components/common/ViewLayout";
import { SortableTable, type Column } from "@/components/common/SortableTable";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { TaskDetail } from "@/components/detail/TaskDetail";
import { statusBorderClass } from "@/components/ui/StatusBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { IssueIndicator } from "@/components/ui/IssueIndicator";
import { QuestionIndicator } from "@/components/ui/QuestionIndicator";

/** Pre-computed row data to avoid re-resolving dates and colors inside render */
interface TaskRow {
  task: Task;
  resolvedDeadline: Date | null;
  resolvedStartDate: Date | null;
  groupColor: string;
  hasUnresolvedIssues: boolean;
  hasUnansweredQuestions: boolean;
}

export function TaskTableView() {
  const project = useProjectStore((s) => s.project)!;
  const filters = useProjectStore((s) => s.filters);
  const selectedTaskId = useProjectStore((s) => s.selectedTaskId);
  const selectTask = useProjectStore((s) => s.selectTask);
  const updateTask = useProjectStore((s) => s.updateTask);

  const helperMap = project.helpers;

  const anchorDate = project.meta.anchor_date;

  const groupColorMap = useMemo(
    () => new Map(project.groups.map((g) => [g.path, g.meta.color])),
    [project.groups],
  );

  const rows: TaskRow[] = useMemo(() => {
    const filtered = applyFilters(project.tasks, filters, anchorDate);
    return filtered.map((task) => ({
      task,
      resolvedDeadline: resolveDeadline(task.deadline, anchorDate, task.time),
      // Use resolveStartDate so that a task with only start_time (no start_date)
      // correctly inherits the deadline's date as the start date for display.
      resolvedStartDate: resolveStartDate(
        task.start_date,
        task.start_time,
        task.deadline,
        anchorDate,
        task.start_time,
      ),
      groupColor: groupColorMap.get(task.group) ?? DEFAULT_GROUP_COLOR,
      hasUnresolvedIssues: task.issues.some((i) => !i.assignee && !i.solution),
      hasUnansweredQuestions: task.questions.some((q) => !q.answer.trim()),
    }));
  }, [project.tasks, filters, anchorDate, groupColorMap]);

  const columns: Column<TaskRow>[] = useMemo(
		() => [
			{
				key: "title",
				label: "Title",
				thClassName: "w-48",
				cellClassName: "px-2 py-2 font-medium text-gray-800",
				compare: (a, b) => a.task.title.localeCompare(b.task.title),
				render: (r) => r.task.title,
			},
			{
				key: "group",
				label: "Group",
				thClassName: "w-36",
				compare: (a, b) => a.task.group.localeCompare(b.task.group),
				render: (r) => (
					<GroupBadge
						groupPath={r.task.group}
						color={r.groupColor}
						className="text-gray-600 text-xs"
					/>
				),
			},
			{
				key: "start_date",
				label: "Start",
				thClassName: "w-40",
				cellClassName: "px-2 py-2 text-gray-600",
				compare: (a, b) =>
					(a.resolvedStartDate?.getTime() ?? Infinity) -
					(b.resolvedStartDate?.getTime() ?? Infinity),
				render: (r) =>
					r.resolvedStartDate ?
						formatDateTime(r.resolvedStartDate)
					:	r.task.start_date || "—",
			},
			{
				key: "deadline",
				label: "Deadline",
				thClassName: "w-40",
				cellClassName: "px-2 py-2 text-gray-600",
				compare: (a, b) =>
					(a.resolvedDeadline?.getTime() ?? Infinity) -
					(b.resolvedDeadline?.getTime() ?? Infinity),
				render: (r) =>
					r.resolvedDeadline ?
						formatDateTime(r.resolvedDeadline)
					:	r.task.deadline || "—",
			},
			{
				key: "assignee",
				label: "Assignee",
				thClassName: "w-28",
				compare: (a, b) => {
					const nameA = helperMap[a.task.assignee]?.name ?? a.task.assignee;
					const nameB = helperMap[b.task.assignee]?.name ?? b.task.assignee;
					return nameA.localeCompare(nameB);
				},
				render: (r) => (
					<select
						value={r.task.assignee}
						onChange={(e) => {
							e.stopPropagation();
							updateTask({ ...r.task, assignee: e.target.value });
						}}
						onClick={(e) => e.stopPropagation()}
						className={`select-table ${statusBorderClass(r.task.status)}`}>
						<option value="">—</option>
						{Object.entries(helperMap).map(([id, helper]) => (
							<option
								key={id}
								value={id}>
								{getInitials(helper.name)}
							</option>
						))}
					</select>
				),
			},
			{
				key: "helpers",
				label: "Helpers",
				thClassName: "w-20",
				cellClassName: "px-2 py-2 text-gray-600",
				compare: (a, b) => a.task.helpers.length - b.task.helpers.length,
				render: (r) => `${r.task.helpers.length}/${r.task.n_helpers_needed}`,
			},
			{
				key: "status",
				label: "Status",
				thClassName: "w-28",
				compare: (a, b) => a.task.status.localeCompare(b.task.status),
				render: (r) => (
					<select
						value={r.task.status}
						onChange={(e) => {
							e.stopPropagation();
							updateTask({ ...r.task, status: e.target.value as TaskStatus });
						}}
						onClick={(e) => e.stopPropagation()}
						className={`select-table ${statusBorderClass(r.task.status)}`}>
						{TASK_STATUSES.map((s) => (
							<option
								key={s}
								value={s}>
								{formatStatus(s)}
							</option>
						))}
					</select>
				),
			},
			{
				key: "issues",
				label: "Issues",
				thClassName: "w-16",
				cellClassName: "px-1 py-2 text-center",
				render: (r) => (r.hasUnresolvedIssues ? <IssueIndicator /> : null),
			},
			{
				key: "questions",
				label: "Questions",
				thClassName: "w-20",
				cellClassName: "px-1 py-2 text-center",
				render: (r) => (r.hasUnansweredQuestions ? <QuestionIndicator /> : null),
			},
			{
				key: "description",
				label: "Description",
				cellClassName: "max-w-0 truncate px-2 py-2 text-gray-500",
				render: (r) => r.task.description || "—",
			},
		],
		[helperMap, updateTask],
  );

  /** Group key extractors for visual day separation — one per date sort column */
  const separatorGroupKeys = useMemo(() => ({
    deadline: (r: TaskRow) => r.resolvedDeadline ? formatDate(r.resolvedDeadline) : null,
    start_date: (r: TaskRow) => r.resolvedStartDate ? formatDate(r.resolvedStartDate) : null,
  }), []);

  const selectedTask = selectedTaskId
    ? project.tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  return (
    <ViewLayout
      filterPanel={<FilterPanel />}
      detailPanel={selectedTask ? <TaskDetail task={selectedTask} /> : null}
    >
      <SortableTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.task.id}
        defaultSortKey="deadline"
        selectedRowKey={selectedTaskId}
        onRowClick={(r) => selectTask(r.task.id === selectedTaskId ? null : r.task.id)}
        emptyMessage="No tasks match the current filters"
        separatorGroupKeys={separatorGroupKeys}
      />
    </ViewLayout>
  );
}
