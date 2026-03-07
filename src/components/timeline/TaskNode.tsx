/**
 * Custom React Flow node for displaying a task on the timeline.
 *
 * Shows: title, resolved deadline date, assignee badge,
 * red dot for unresolved issues, question mark for unanswered questions.
 * Background color matches the task's group color.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TaskNodeData } from "./layout";
import { formatDate } from "@/lib/dates";

function TaskNodeComponent({ data, selected }: NodeProps) {
  const {
    task,
    groupColor,
    resolvedDate,
    hasUnresolvedIssues,
    hasUnansweredQuestions,
    assigneeName,
  } = data as TaskNodeData;

  const dateStr = resolvedDate ? formatDate(resolvedDate) : task.deadline || "no date";

  // Status indicator styling
  const statusBorder = {
    todo: "border-gray-400",
    in_progress: "border-yellow-400",
    finished: "border-green-500",
    cancelled: "border-red-400",
  }[task.status] ?? "border-gray-400";

  return (
    <div
      className={`relative rounded-md border-2 shadow-md transition-shadow ${statusBorder} ${
        selected ? "ring-2 ring-orange-400 ring-offset-1" : ""
      }`}
      style={{
        backgroundColor: groupColor,
        minWidth: 160,
        padding: "8px 10px",
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />

      {/* Title + date */}
      <div className="text-sm font-semibold leading-tight text-white drop-shadow-sm">
        {task.title}
      </div>
      <div className="mt-0.5 text-xs text-white/80">{dateStr}</div>

      {/* Assignee badge */}
      {assigneeName && (
        <div className="mt-1 inline-block rounded bg-green-700 px-1.5 py-0.5 text-xs font-bold text-white">
          {assigneeName}
        </div>
      )}

      {/* Issue indicator (red dot) */}
      {hasUnresolvedIssues && (
        <div
          className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-red-500 shadow"
          title="Has unresolved issues"
        />
      )}

      {/* Unanswered question indicator */}
      {hasUnansweredQuestions && (
        <div
          className="absolute -right-2 top-4 flex h-4 w-4 items-center justify-center rounded-full bg-orange-400 text-xs font-bold text-white shadow"
          title="Has unanswered questions"
        >
          ?
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}

export const TaskNode = memo(TaskNodeComponent);
