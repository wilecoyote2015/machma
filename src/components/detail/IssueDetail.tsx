/**
 * Right sidebar panel showing the detail of a selected issue.
 *
 * Uses ItemDetailShell for the shared header, task info section,
 * and TaskDetail toggle. Only issue-specific editing sections
 * (title, assignee, description, solution) are defined here.
 */

import type { Task, TaskIssue } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { PanelSection } from "@/components/common/PanelSection";
import { MarkdownBlock } from "@/components/common/MarkdownBlock";
import { ItemDetailShell } from "@/components/detail/ItemDetailShell";

interface IssueDetailProps {
  /** The parent task containing this issue */
  task: Task;
  /** Index of the issue within task.issues */
  issueIndex: number;
  /** Called when the panel should close */
  onClose: () => void;
}

export function IssueDetail({ task, issueIndex, onClose }: IssueDetailProps) {
  const project = useProjectStore((s) => s.project)!;
  const updateTask = useProjectStore((s) => s.updateTask);

  const issue = task.issues[issueIndex];
  if (!issue) return null;

  const resolved = !!issue.solution.trim();
  const helperIds = Object.keys(project.helpers);

  /** Persist an updated issue back to the task */
  const updateIssue = (updated: TaskIssue) => {
    const issues = [...task.issues];
    issues[issueIndex] = updated;
    updateTask({ ...task, issues });
  };

  return (
    <ItemDetailShell
      title={issue.title}
      headerExtra={
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            resolved ? "bg-success-light text-success-text" : "bg-danger-light text-danger-text"
          }`}
        >
          {resolved ? "resolved" : "unresolved"}
        </span>
      }
      task={task}
      itemLabel="issue"
      onClose={onClose}
    >
      {/* ── Issue details ─────────────────────────────────── */}
      <PanelSection title="Issue Details">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold">Title</label>
            <input
              value={issue.title}
              onChange={(e) => updateIssue({ ...issue, title: e.target.value })}
              className="input-panel flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold">Assignee</label>
            <select
              value={issue.assignee}
              onChange={(e) => updateIssue({ ...issue, assignee: e.target.value })}
              className="select-panel flex-1"
            >
              <option value="" className="text-black">—</option>
              {helperIds.map((id) => (
                <option key={id} value={id} className="text-black">
                  {id} ({project.helpers[id]!.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </PanelSection>

      {/* ── Description ──────────────────────────────────── */}
      <PanelSection title="Description">
        <div className="rounded bg-white p-2 text-gray-800">
          <MarkdownBlock
            content={issue.description}
            onSave={(description) => updateIssue({ ...issue, description })}
            placeholder="No description"
          />
        </div>
      </PanelSection>

      {/* ── Solution ─────────────────────────────────────── */}
      <PanelSection title="Solution" badge={resolved ? "resolved" : "open"}>
        <div className="rounded bg-white p-2 text-gray-800">
          <MarkdownBlock
            content={issue.solution}
            onSave={(solution) => updateIssue({ ...issue, solution })}
            placeholder="No solution yet"
          />
        </div>
      </PanelSection>
    </ItemDetailShell>
  );
}
