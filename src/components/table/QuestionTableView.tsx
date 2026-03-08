/**
 * Sortable flat question table view wrapped in ViewLayout.
 *
 * Flattens all questions from all tasks into rows. Uses SortableTable
 * for table rendering, QuestionFilterPanel for filtering, and
 * QuestionDetail for the right panel.
 *
 * Filter state is local (not shared with other views).
 */

import { useMemo, useState } from "react";
import type { Task, TaskQuestion } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { resolveDeadline, formatDate } from "@/lib/dates";
import { getInitials } from "@/lib/format";
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";
import { ViewLayout } from "@/components/common/ViewLayout";
import { SortableTable, type Column } from "@/components/common/SortableTable";
import { QuestionFilterPanel, emptyQuestionFilters } from "@/components/filters/QuestionFilterPanel";
import type { QuestionFilterState } from "@/components/filters/QuestionFilterPanel";
import { QuestionDetail } from "@/components/detail/QuestionDetail";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";

// ── Flat row model ──────────────────────────────────────────────────

/** A single flattened question row joining question data with its parent task */
interface FlatQuestion {
  taskId: string;
  questionIndex: number;
  question: TaskQuestion;
  task: Task;
  answered: boolean;
  resolvedDeadline: Date | null;
  groupColor: string;
  /** Pre-resolved task assignee display label (initials or raw ID fallback) */
  taskAssigneeLabel: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ── Component ───────────────────────────────────────────────────────

export function QuestionTableView() {
  const project = useProjectStore((s) => s.project)!;
  const anchorDate = project.meta.anchor_date;

  const [filters, setFilters] = useState<QuestionFilterState>(emptyQuestionFilters);
  const [selectedRef, setSelectedRef] = useState<{ taskId: string; questionIndex: number } | null>(null);

  const groupColorMap = useMemo(
    () => new Map(project.groups.map((g) => [g.path, g.meta.color])),
    [project.groups],
  );

  // ── Flatten → filter ───────────────────────────────────────────
  const rows: FlatQuestion[] = useMemo(() => {
    const now = Date.now();
    const flat: FlatQuestion[] = [];

    for (const task of project.tasks) {
      for (let i = 0; i < task.questions.length; i++) {
        const question = task.questions[i]!;
        const answered = !!question.answer.trim();
        const resolvedDeadline = resolveDeadline(task.deadline, anchorDate);

        // Apply filters inline during flattening for efficiency
        if (filters.questionStatus === "answered" && !answered) continue;
        if (filters.questionStatus === "unanswered" && answered) continue;
        if (filters.taskAssignees.size > 0 && !filters.taskAssignees.has(task.assignee)) continue;
        if (filters.groups.size > 0 && !filters.groups.has(task.group)) continue;
        if (filters.deadlineWithinDays !== null) {
          if (!resolvedDeadline) continue;
          if ((resolvedDeadline.getTime() - now) / MS_PER_DAY > filters.deadlineWithinDays) continue;
        }

        const taskHelper = project.helpers[task.assignee];

        flat.push({
          taskId: task.id,
          questionIndex: i,
          question,
          task,
          answered,
          resolvedDeadline,
          groupColor: groupColorMap.get(task.group) ?? DEFAULT_GROUP_COLOR,
          taskAssigneeLabel: taskHelper ? getInitials(taskHelper.name) : task.assignee,
        });
      }
    }
    return flat;
  }, [project.tasks, anchorDate, filters, groupColorMap]);

  // ── Column definitions ─────────────────────────────────────────
  const columns: Column<FlatQuestion>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        thClassName: "w-44",
        cellClassName: "px-2 py-2 font-medium text-gray-800",
        compare: (a, b) => a.question.title.localeCompare(b.question.title),
        render: (r) => r.question.title,
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
        key: "status",
        label: "Status",
        thClassName: "w-28",
        compare: (a, b) => Number(a.answered) - Number(b.answered),
        render: (r) => (
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              r.answered ? "bg-success-light text-success-text" : "bg-warning-light text-warning-text"
            }`}
          >
            {r.answered ? "answered" : "unanswered"}
          </span>
        ),
      },
      {
        key: "answer",
        label: "Answer",
        thClassName: "w-48",
        cellClassName: "max-w-0 truncate px-2 py-2 text-gray-500",
        compare: (a, b) => a.question.answer.localeCompare(b.question.answer),
        render: (r) => r.question.answer || "—",
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
    ? `${selectedRef.taskId}-${selectedRef.questionIndex}`
    : null;

  return (
    <ViewLayout
      filterPanel={<QuestionFilterPanel filters={filters} onChange={setFilters} />}
      detailPanel={
        selectedTask && selectedRef ? (
          <QuestionDetail
            task={selectedTask}
            questionIndex={selectedRef.questionIndex}
            onClose={() => setSelectedRef(null)}
          />
        ) : null
      }
    >
      <SortableTable
        columns={columns}
        data={rows}
        rowKey={(r) => `${r.taskId}-${r.questionIndex}`}
        defaultSortKey="deadline"
        selectedRowKey={selectedRowKey}
        onRowClick={(r) =>
          setSelectedRef(
            selectedRef?.taskId === r.taskId && selectedRef?.questionIndex === r.questionIndex
              ? null
              : { taskId: r.taskId, questionIndex: r.questionIndex },
          )
        }
        emptyMessage="No questions match the current filters"
      />
    </ViewLayout>
  );
}
