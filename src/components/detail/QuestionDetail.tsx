/**
 * Right sidebar panel showing the detail of a selected question.
 *
 * Uses ItemDetailShell for the shared header, task info section,
 * and TaskDetail toggle. Only question-specific editing sections
 * (title, recurring flag, answer) are defined here.
 */

import type { Task, TaskQuestion } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { PanelSection } from "@/components/common/PanelSection";
import { MarkdownBlock } from "@/components/common/MarkdownBlock";
import { ItemDetailShell } from "@/components/detail/ItemDetailShell";

interface QuestionDetailProps {
  /** The parent task containing this question */
  task: Task;
  /** Index of the question within task.questions */
  questionIndex: number;
  /** Called when the panel should close */
  onClose: () => void;
}

export function QuestionDetail({ task, questionIndex, onClose }: QuestionDetailProps) {
  const updateTask = useProjectStore((s) => s.updateTask);

  const question = task.questions[questionIndex];
  if (!question) return null;

  const answered = !!question.answer.trim();

  /** Persist an updated question back to the task */
  const updateQuestion = (updated: TaskQuestion) => {
    const questions = [...task.questions];
    questions[questionIndex] = updated;
    updateTask({ ...task, questions });
  };

  return (
    <ItemDetailShell
      title={question.title}
      headerExtra={
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              answered ? "bg-success-light text-success-text" : "bg-warning-light text-warning-text"
            }`}
          >
            {answered ? "answered" : "unanswered"}
          </span>
          {question.recurring && (
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs">recurring</span>
          )}
        </div>
      }
      task={task}
      itemLabel="question"
      onClose={onClose}
    >
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
    </ItemDetailShell>
  );
}
