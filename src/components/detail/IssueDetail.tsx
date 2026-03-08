/**
 * Right sidebar panel showing the detail of a selected issue.
 *
 * Displays issue metadata (title, status, assignee, description, solution)
 * and a clickable parent task link. Clicking the task name replaces
 * the panel content with the full TaskDetail; a back button returns
 * to the issue detail view.
 */

import { useState } from "react";
import type { Task, TaskIssue } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { PanelSection } from "@/components/common/PanelSection";
import { MarkdownBlock } from "@/components/common/MarkdownBlock";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";
import { TaskDetail } from "@/components/detail/TaskDetail";
import { resolveDeadline, formatDate } from "@/lib/dates";
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";

/** Badge for resolved / unresolved issue status */
function IssueStatusBadge({ resolved }: { resolved: boolean }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        resolved
          ? "bg-success-light text-success-text"
          : "bg-danger-light text-danger-text"
      }`}
    >
      {resolved ? "resolved" : "unresolved"}
    </span>
  );
}

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

  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const issue = task.issues[issueIndex];
  if (!issue) return null;

  const resolved = !!issue.solution.trim();
  const helperIds = Object.keys(project.helpers);
  const groupColor =
    project.groups.find((g) => g.path === task.group)?.meta.color ?? DEFAULT_GROUP_COLOR;
  const resolvedDate = resolveDeadline(task.deadline, project.meta.anchor_date);

  /** Persist an updated issue back to the task */
  const updateIssue = (updated: TaskIssue) => {
    const issues = [...task.issues];
    issues[issueIndex] = updated;
    updateTask({ ...task, issues });
  };

  // Delegate to TaskDetail when the user clicked the task name
  if (showTaskDetail) {
    return (
      <div className="space-y-1 text-white">
        <button
          onClick={() => setShowTaskDetail(false)}
          className="mb-2 flex items-center gap-1 text-sm text-white/70 hover:text-white"
        >
          ← Back to issue
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
          <h2 className="text-xl font-bold">{issue.title}</h2>
          <div className="mt-1">
            <IssueStatusBadge resolved={resolved} />
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
    </div>
  );
}
