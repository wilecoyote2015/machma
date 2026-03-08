import { DEFAULT_ASSIGNEE_COLOR } from "@/lib/constants";

/**
 * Colored badge showing an assignee name or initials.
 *
 * When `color` is provided, it overrides the default green background.
 * Used in TaskNode, TaskTableView, and HelperListView.
 */
export function AssigneeBadge({
  label,
  variant = "dark",
  color,
}: {
  label: string;
  /** "dark" = white text on colored bg (for dark/colored backgrounds), "light" = dark text on lighter bg (for white backgrounds) */
  variant?: "dark" | "light";
  /** Custom hex color for the badge background (falls back to DEFAULT_ASSIGNEE_COLOR) */
  color?: string;
}) {
  const bgColor = color || DEFAULT_ASSIGNEE_COLOR;

  if (variant === "light") {
    return (
      <span
        className="rounded px-1.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: bgColor + "30", color: bgColor }}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: bgColor }}
    >
      {label}
    </span>
  );
}
