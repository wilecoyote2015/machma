/**
 * A non-interactive React Flow node that renders a date tick mark
 * on the vertical timeline axis. Shows a date label with a small
 * horizontal tick line extending to the right.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TimelineTickData } from "./layout";

function TimelineTickNodeComponent({ data }: NodeProps) {
  const { label } = data as TimelineTickData;

  return (
    <div className="flex items-center" style={{ pointerEvents: "none" }}>
      {/* Date label */}
      <div className="pr-2 text-xs font-medium text-gray-500 whitespace-nowrap">
        {label}
      </div>
      {/* Horizontal tick mark */}
      <div className="h-px w-4 bg-gray-400" />

      {/* Invisible handles for edge connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-0 !w-0 !border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-0 !w-0 !border-0 !bg-transparent"
      />
    </div>
  );
}

export const TimelineTickNode = memo(TimelineTickNodeComponent);
