/**
 * Shared wrapper for issue/question detail panels.
 *
 * Provides:
 * - Header with title, optional subtitle elements (badges), and close button
 * - Parent task info section with clickable task name link
 * - TaskDetail toggle: clicking the task name replaces the panel with
 *   the full TaskDetail, with a back button to return
 *
 * Each consumer (IssueDetail, QuestionDetail) passes its item-specific
 * editing sections as children.
 */

import { useState, type ReactNode } from "react";
import type { Task } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { PanelSection } from "@/components/common/PanelSection";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";
import { TaskDetail } from "@/components/detail/TaskDetail";
import { resolveDeadline, formatDate } from "@/lib/dates";
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";

interface ItemDetailShellProps {
  /** Display title (e.g. the issue or question title) */
  title: string;
  /** Additional header elements rendered below the title (e.g. status badges) */
  headerExtra?: ReactNode;
  /** The parent task containing this item */
  task: Task;
  /** Label used in the back button (e.g. "issue" → "← Back to issue") */
  itemLabel: string;
  /** Called when the panel should close */
  onClose: () => void;
  /** Item-specific editing sections */
  children: ReactNode;
}

export function ItemDetailShell({
  title,
  headerExtra,
  task,
  itemLabel,
  onClose,
  children,
}: ItemDetailShellProps) {
  const project = useProjectStore((s) => s.project)!;
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const groupColor =
    project.groups.find((g) => g.path === task.group)?.meta.color ?? DEFAULT_GROUP_COLOR;
  const resolvedDate = resolveDeadline(task.deadline, project.meta.anchor_date);

  // Delegate to TaskDetail when the user clicked the task name
  if (showTaskDetail) {
    return (
      <div className="space-y-1 text-white">
        <button
          onClick={() => setShowTaskDetail(false)}
          className="mb-2 flex items-center gap-1 text-sm text-white/70 hover:text-white"
        >
          ← Back to {itemLabel}
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
          <h2 className="text-xl font-bold">{title}</h2>
          {headerExtra && <div className="mt-1">{headerExtra}</div>}
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
            {task.assignee ? (
              <AssigneeBadge label={task.assignee} variant="dark" />
            ) : (
              <span>—</span>
            )}
          </div>
        </div>
      </PanelSection>

      {/* ── Item-specific content ──────────────────────────── */}
      {children}
    </div>
  );
}
