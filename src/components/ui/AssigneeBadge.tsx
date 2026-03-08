/**
 * Green badge showing an assignee name or initials.
 * Used in TaskNode, TaskTableView, and FilterPanel.
 */
export function AssigneeBadge({
  label,
  variant = "dark",
}: {
  label: string;
  /** "dark" = white text on green (for colored backgrounds), "light" = dark text on light green (for white backgrounds) */
  variant?: "dark" | "light";
}) {
  const styles =
    variant === "dark"
      ? "bg-success text-white"
      : "bg-success-light text-success-text";

  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}
