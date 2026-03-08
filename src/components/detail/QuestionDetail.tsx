/**
 * Right sidebar panel showing the detail of a selected question.
 *
 * Displays question metadata (title, status, recurring flag, answer)
 * and a clickable parent task link. Clicking the task name replaces
 * the panel content with the full TaskDetail; a back button returns
 * to the question detail view.
 */

import { useState } from "react";
import type { Task, TaskQuestion } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { PanelSection } from "@/components/common/PanelSection";
import { MarkdownBlock } from "@/components/common/MarkdownBlock";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";
import { TaskDetail } from "@/components/detail/TaskDetail";
import { resolveDeadline, formatDate } from "@/lib/dates";
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";

/** Badge for answered / unanswered question status */
function QuestionStatusBadge({ answered }: { answered: boolean }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        answered
          ? "bg-success-light text-success-text"
          : "bg-warning-light text-warning-text"
      }`}
    >
      {answered ? "answered" : "unanswered"}
    </span>
  );
}

interface QuestionDetailProps {
  /** The parent task containing this question */
  task: Task;
  /** Index of the question within task.questions */
  questionIndex: number;
  /** Called when the panel should close */
  onClose: () => void;
}

export function QuestionDetail({ task, questionIndex, onClose }: QuestionDetailProps) {
  const project = useProjectStore((s) => s.project)!;
  const updateTask = useProjectStore((s) => s.updateTask);

  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const question = task.questions[questionIndex];
  if (!question) return null;

  const answered = !!question.answer.trim();
  const groupColor =
    project.groups.find((g) => g.path === task.group)?.meta.color ?? DEFAULT_GROUP_COLOR;
  const resolvedDate = resolveDeadline(task.deadline, project.meta.anchor_date);

  /** Persist an updated question back to the task */
  const updateQuestion = (updated: TaskQuestion) => {
    const questions = [...task.questions];
    questions[questionIndex] = updated;
    updateTask({ ...task, questions });
  };

  // Delegate to TaskDetail when the user clicked the task name
  if (showTaskDetail) {
    return (
      <div className="space-y-1 text-white">
        <button
          onClick={() => setShowTaskDetail(false)}
          className="mb-2 flex items-center gap-1 text-sm text-white/70 hover:text-white"
        >
          ← Back to question
        </button>
        <TaskDetail task={task} />
      </div>
    );
  }

  return (
    <div className="space-y-1 text-white">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between pb-2">
        <div className="flex-1">
          <h2 className="text-xl font-bold">{question.title}</h2>
          <div className="mt-1 flex items-center gap-2">
            <QuestionStatusBadge answered={answered} />
            {question.recurring && (
              <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs">recurring</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white" title="Close">
          ✕
        </button>
      </div>

      {/* ── Parent task info ──────────────────────────────── */}
      <PanelSection title="Task">
        <div className="space-y-1.5 text-sm">
          <button
            onClick={() => setShowTaskDetail(true)}
            className="text-left font-medium text-blue-300 underline hover:text-blue-200"
            title="Open full task detail"
          >
            {task.title}
          </button>
          <div className="flex items-center gap-2">
            <span className="w-16 text-white/70">Group</span>
            <GroupBadge groupPath={task.group} color={groupColor} />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 text-white/70">Deadline</span>
            <span>{resolvedDate ? formatDate(resolvedDate) : task.deadline || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 text-white/70">Assignee</span>
            {task.assignee ? <AssigneeBadge label={task.assignee} variant="dark" /> : <span>—</span>}
          </div>
        </div>
      </PanelSection>

      {/* ── Question details ──────────────────────────────── */}
      <PanelSection title="Question Details">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold">Title</label>
            <input
              value={question.title}
              onChange={(e) => updateQuestion({ ...question, title: e.target.value })}
              className="input-panel flex-1"
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={question.recurring}
              onChange={(e) => updateQuestion({ ...question, recurring: e.target.checked })}
              className="accent-white"
            />
            Recurring
          </label>
        </div>
      </PanelSection>

      {/* ── Answer ────────────────────────────────────────── */}
      <PanelSection title="Answer" badge={answered ? "answered" : "unanswered"}>
        <div className="rounded bg-white p-2 text-gray-800">
          <MarkdownBlock
            content={question.answer}
            onSave={(answer) => updateQuestion({ ...question, answer })}
            placeholder="No answer yet"
          />
        </div>
      </PanelSection>
    </div>
  );
}
