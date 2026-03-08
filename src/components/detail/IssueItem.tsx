/**
 * A single issue entry in the task detail panel.
 */

import type { TaskIssue } from "@/types";
import { MarkdownBlock } from "@/components/common/MarkdownBlock";

interface IssueItemProps {
  issue: TaskIssue;
  helperIds: string[];
  onUpdate: (i: TaskIssue) => void;
  onRemove: () => void;
}

export function IssueItem({ issue, helperIds, onUpdate, onRemove }: IssueItemProps) {
  const resolved = !!issue.solution.trim();

  return (
    <div className={`mb-2 rounded p-2 ${resolved ? "bg-white/10" : "bg-issue-bg/30"}`}>
      <div className="flex items-start justify-between gap-2">
        <input
          value={issue.title}
          onChange={(e) => onUpdate({ ...issue, title: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium text-white focus:outline-none"
        />
        <button onClick={onRemove} className="text-xs text-white/50 hover:text-issue">✕</button>
      </div>
      <div className="mt-1 rounded bg-white p-1 text-gray-800">
        <MarkdownBlock
          content={issue.description}
          onSave={(description) => onUpdate({ ...issue, description })}
          placeholder="Describe the issue..."
        />
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <label className="font-semibold">Assignee:</label>
        <select
          value={issue.assignee}
          onChange={(e) => onUpdate({ ...issue, assignee: e.target.value })}
          className="select-panel text-xs"
        >
          <option value="" className="text-black">—</option>
          {helperIds.map((id) => (
            <option key={id} value={id} className="text-black">{id}</option>
          ))}
        </select>
      </div>
      <div className="mt-1">
        <label className="text-xs font-semibold">Solution:</label>
        <div className="rounded bg-white p-1 text-gray-800">
          <MarkdownBlock
            content={issue.solution}
            onSave={(solution) => onUpdate({ ...issue, solution })}
            placeholder="No solution yet"
          />
        </div>
      </div>
    </div>
  );
}
