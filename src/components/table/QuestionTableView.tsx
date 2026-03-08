/**
 * Sortable flat question table view wrapped in ViewLayout.
 *
 * Flattens all questions from all tasks into rows, with columns:
 * name (question title), task, group, deadline, task assignee,
 * status (answered/unanswered), answer (truncated), task description.
 *
 * The filter panel and detail panel are question-specific.
 * Filter state is local (not shared with other views).
 */

import { useMemo, useState } from "react";
import type { Task, TaskQuestion } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { resolveDeadline, formatDate } from "@/lib/dates";
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";
import { ViewLayout } from "@/components/common/ViewLayout";
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
}

// ── Sorting ─────────────────────────────────────────────────────────

type SortKey =
  | "name"
  | "task"
  | "group"
  | "deadline"
  | "taskAssignee"
  | "status"
  | "answer";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "name", label: "Name", className: "w-44" },
  { key: "task", label: "Task", className: "w-40" },
  { key: "group", label: "Group", className: "w-32" },
  { key: "deadline", label: "Deadline", className: "w-28" },
  { key: "taskAssignee", label: "Task Assignee", className: "w-28" },
  { key: "status", label: "Status", className: "w-28" },
  { key: "answer", label: "Answer", className: "w-48" },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ── Component ───────────────────────────────────────────────────────

export function QuestionTableView() {
  const project = useProjectStore((s) => s.project)!;
  const anchorDate = project.meta.anchor_date;

  const [filters, setFilters] = useState<QuestionFilterState>(emptyQuestionFilters);
  const [sortKey, setSortKey] = useState<SortKey>("deadline");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedRef, setSelectedRef] = useState<{ taskId: string; questionIndex: number } | null>(null);

  const groupColorMap = useMemo(
    () => new Map(project.groups.map((g) => [g.path, g.meta.color])),
    [project.groups],
  );

  // ── Flatten all questions across all tasks ─────────────────────
  const allFlatQuestions: FlatQuestion[] = useMemo(() => {
    const rows: FlatQuestion[] = [];
    for (const task of project.tasks) {
      for (let i = 0; i < task.questions.length; i++) {
        const question = task.questions[i]!;
        rows.push({
          taskId: task.id,
          questionIndex: i,
          question,
          task,
          answered: !!question.answer.trim(),
          resolvedDeadline: resolveDeadline(task.deadline, anchorDate),
        });
      }
    }
    return rows;
  }, [project.tasks, anchorDate]);

  // ── Apply filters ──────────────────────────────────────────────
  const filteredQuestions = useMemo(() => {
    const now = Date.now();

    return allFlatQuestions.filter((row) => {
      // Question status
      if (filters.questionStatus === "answered" && !row.answered) return false;
      if (filters.questionStatus === "unanswered" && row.answered) return false;

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
  }, [allFlatQuestions, filters]);

  // ── Sort ───────────────────────────────────────────────────────
  const sortedQuestions = useMemo(() => {
    const compare = (a: FlatQuestion, b: FlatQuestion): number => {
      switch (sortKey) {
        case "name":
          return a.question.title.localeCompare(b.question.title);
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
        case "status":
          return Number(a.answered) - Number(b.answered);
        case "answer":
          return a.question.answer.localeCompare(b.question.answer);
      }
    };
    const sorted = [...filteredQuestions].sort(compare);
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [filteredQuestions, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ── Resolve selected question (re-derive from latest project state) ──
  const selectedTask = selectedRef
    ? project.tasks.find((t) => t.id === selectedRef.taskId) ?? null
    : null;

  const isSelected = (taskId: string, questionIndex: number) =>
    selectedRef?.taskId === taskId && selectedRef?.questionIndex === questionIndex;

  // ── Render ─────────────────────────────────────────────────────
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
            {sortedQuestions.map((row) => {
              const selected = isSelected(row.taskId, row.questionIndex);
              const groupColor = groupColorMap.get(row.task.group) ?? DEFAULT_GROUP_COLOR;

              return (
                <tr
                  key={`${row.taskId}-${row.questionIndex}`}
                  onClick={() =>
                    setSelectedRef(
                      selected
                        ? null
                        : { taskId: row.taskId, questionIndex: row.questionIndex },
                    )
                  }
                  className={`cursor-pointer border-b border-gray-100 transition-colors ${
                    selected ? "bg-primary-subtle" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-2 py-2 font-medium text-gray-800">{row.question.title}</td>
                  <td className="px-2 py-2 text-gray-700">{row.task.title}</td>
                  <td className="px-2 py-2">
                    <GroupBadge
                      groupPath={row.task.group}
                      color={groupColor}
                      className="text-xs text-gray-600"
                    />
                  </td>
                  <td className="px-2 py-2 text-gray-600">
                    {row.resolvedDeadline
                      ? formatDate(row.resolvedDeadline)
                      : row.task.deadline || "—"}
                  </td>
                  <td className="px-2 py-2">
                    {row.task.assignee ? (
                      <AssigneeBadge label={row.task.assignee} variant="light" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        row.answered
                          ? "bg-success-light text-success-text"
                          : "bg-warning-light text-warning-text"
                      }`}
                    >
                      {row.answered ? "answered" : "unanswered"}
                    </span>
                  </td>
                  <td className="max-w-0 truncate px-2 py-2 text-gray-500">
                    {row.question.answer || "—"}
                  </td>
                  <td className="max-w-0 truncate px-2 py-2 text-gray-500">
                    {row.task.description || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedQuestions.length === 0 && (
          <p className="mt-8 text-center text-gray-400">
            No questions match the current filters
          </p>
        )}
      </div>
    </ViewLayout>
  );
}
