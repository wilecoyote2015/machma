/**
 * Reusable person badge component: color indicator circle + name.
 * Mirrors the GroupBadge pattern for visual consistency between
 * groups and people in filter panels and elsewhere.
 */

import { DEFAULT_ASSIGNEE_COLOR } from "@/lib/constants";

interface PersonBadgeProps {
  /** Display name of the person */
  name: string;
  /** Hex color for the indicator circle (falls back to DEFAULT_ASSIGNEE_COLOR) */
  color?: string;
  /** Additional CSS classes for the outer wrapper */
  className?: string;
}

/**
 * Renders a small colored circle followed by the person's name.
 * Defaults to DEFAULT_ASSIGNEE_COLOR when no color is provided.
 */
export function PersonBadge({
  name,
  color,
  className = "",
}: PersonBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={name}>
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color || DEFAULT_ASSIGNEE_COLOR }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
