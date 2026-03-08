/**
 * Custom React Flow node for displaying a task on the timeline.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TaskNodeData } from "./layout";
import { formatDate } from "@/lib/dates";
import { statusBorderClass } from "@/components/ui/StatusBadge";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";
import { IssueIndicator } from "@/components/ui/IssueIndicator";
import { QuestionIndicator } from "@/components/ui/QuestionIndicator";

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
  const borderClass = statusBorderClass(task.status);

  return (
    <div
      className={`relative rounded-md border-2 shadow-md transition-shadow ${borderClass} ${
        selected ? "ring-2 ring-primary ring-offset-1" : ""
      }`}
      style={{ backgroundColor: groupColor, minWidth: 160, padding: "8px 10px" }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />

      <div className="text-sm font-semibold leading-tight text-white drop-shadow-sm">
        {task.title}
      </div>
      <div className="mt-0.5 text-xs text-white/80">{dateStr}</div>

      {assigneeName && (
        <div className="mt-1">
          <AssigneeBadge label={assigneeName} variant="dark" />
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

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}

export const TaskNode = memo(TaskNodeComponent);
