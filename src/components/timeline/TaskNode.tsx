/**
 * Custom React Flow node for displaying a task on the timeline.
 *
 * Top handle  = target (input)  — drop a connection here to add a dependency.
 * Bottom handle = source (output) — drag from here to create a dependency.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NODE_WIDTH, type TaskNodeData } from "./layout";
import { formatDate } from "@/lib/dates";
import { statusBorderClass } from "@/components/ui/StatusBadge";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";
import { IssueIndicator } from "@/components/ui/IssueIndicator";
import { QuestionIndicator } from "@/components/ui/QuestionIndicator";

/**
 * Shared Tailwind classes for connection handles.
 * Larger hit-area + hover glow make them easy to discover and grab.
 */
const HANDLE_CLASS =
  "!w-3 !h-3 !bg-gray-300 !border-2 !border-white/60 hover:!bg-primary hover:!border-white transition-colors";

function TaskNodeComponent({ data, selected }: NodeProps) {
  const {
    task,
    groupColor,
    resolvedDate,
    hasUnresolvedIssues,
    hasUnansweredQuestions,
    assigneeName,
    assigneeColor,
  } = data as TaskNodeData;

  const dateStr = resolvedDate ? formatDate(resolvedDate) : task.deadline || "no date";
  const borderClass = statusBorderClass(task.status);

  return (
    <div
      className={`relative rounded-md border-2 shadow-md transition-shadow ${borderClass} ${
        selected ? "ring-2 ring-primary ring-offset-1" : ""
      }`}
      style={{ backgroundColor: groupColor, width: NODE_WIDTH, padding: "8px 10px" }}
    >
      <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />

      <div className="truncate text-sm font-semibold leading-tight text-white drop-shadow-sm">
        {task.title}
      </div>
      <div className="mt-0.5 text-xs text-white/80">{dateStr}</div>

      {assigneeName && (
        <div className="mt-1">
          <AssigneeBadge label={assigneeName} variant="dark" color={assigneeColor || undefined} />
        </div>
      )}

      {hasUnresolvedIssues && (
        <div className="absolute -right-2 -top-2">
          <IssueIndicator className="h-4 w-4 shadow" />
        </div>
      )}

      {hasUnansweredQuestions && (
        <div className="absolute -right-2 top-4">
          <QuestionIndicator className="shadow" />
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS} />
    </div>
  );
}

export const TaskNode = memo(TaskNodeComponent);
