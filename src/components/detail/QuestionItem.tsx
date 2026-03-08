/**
 * A single question entry in the task detail panel.
 */

import type { TaskQuestion } from "@/types";
import { MarkdownBlock } from "@/components/common/MarkdownBlock";

interface QuestionItemProps {
  question: TaskQuestion;
  onUpdate: (q: TaskQuestion) => void;
  onRemove: () => void;
}

export function QuestionItem({ question, onUpdate, onRemove }: QuestionItemProps) {
  const answered = !!question.answer.trim();

  return (
    <div className="mb-2 rounded bg-white/10 p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <input
            value={question.title}
            onChange={(e) => onUpdate({ ...question, title: e.target.value })}
            className="w-full bg-transparent text-sm font-medium text-white focus:outline-none"
          />
          <label className="mt-1 flex items-center gap-1 text-xs text-white/70">
            <input
              type="checkbox"
              checked={question.recurring}
              onChange={(e) => onUpdate({ ...question, recurring: e.target.checked })}
              className="accent-white"
            />
            Recurring
          </label>
        </div>
        <div className="flex items-center gap-1">
          {!answered && <span className="text-xs text-question" title="Unanswered">?</span>}
          <button onClick={onRemove} className="text-xs text-white/50 hover:text-issue">✕</button>
        </div>
      </div>
      <div className="mt-1 rounded bg-white p-1 text-gray-800">
        <MarkdownBlock
          content={question.answer}
          onSave={(answer) => onUpdate({ ...question, answer })}
          placeholder="No answer yet"
        />
      </div>
    </div>
  );
}
