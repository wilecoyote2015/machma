import type { TaskStatus } from "@/types";
import { formatStatus } from "@/lib/constants";

/**
 * Shared status display. Renders as:
 * - A colored inline badge (variant="badge", default)
 * - A border color class string (variant="border") for TaskNode
 */

const BADGE_STYLES: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-warning-light text-warning-text",
  finished: "bg-success-light text-success-text",
  cancelled: "bg-danger-light text-danger-text",
};

const BORDER_STYLES: Record<TaskStatus, string> = {
  todo: "border-gray-400",
  in_progress: "border-yellow-400",
  finished: "border-green-500",
  cancelled: "border-issue",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[status]}`}>
      {formatStatus(status)}
    </span>
  );
}

/** Returns a Tailwind border-color class for a given task status. */
export function statusBorderClass(status: TaskStatus): string {
  return BORDER_STYLES[status];
}
