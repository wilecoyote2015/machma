/**
 * Reusable group badge component: color indicator circle + group path.
 * Used consistently across table rows, filter panel, detail panel, and dialogs.
 */

import { DEFAULT_GROUP_COLOR } from "@/lib/constants";

interface GroupBadgeProps {
  /** Slash-separated group path, e.g. "misc" or "pferd/feeding" */
  groupPath: string;
  /** Hex color for the indicator circle */
  color?: string;
  /** Additional CSS classes for the outer wrapper */
  className?: string;
}

/**
 * Renders a small colored circle followed by the group path.
 * Defaults to DEFAULT_GROUP_COLOR when no color is provided.
 */
export function GroupBadge({
  groupPath,
  color = DEFAULT_GROUP_COLOR,
  className = "",
}: GroupBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={groupPath}>
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{groupPath}</span>
    </span>
  );
}
