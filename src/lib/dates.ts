/**
 * Utilities for resolving task deadlines relative to the project anchor date.
 */

/**
 * Resolve a deadline string to a Date object.
 *
 * Supports:
 * - Relative offsets: "-5d", "+2d" (days relative to anchorDate)
 * - Absolute dates: "2026-05-01"
 * - Absolute datetimes: "2026-05-01 14:30"
 *
 * Returns null if the deadline string is empty or unparseable.
 */
export function resolveDeadline(
  deadline: string,
  anchorDate: string,
): Date | null {
  if (!deadline.trim()) return null;

  // Relative offset: +Nd or -Nd
  const relMatch = deadline.match(/^([+-]?\d+)d$/);
  if (relMatch) {
    const days = parseInt(relMatch[1]!, 10);
    const anchor = new Date(anchorDate + "T00:00:00");
    anchor.setDate(anchor.getDate() + days);
    return anchor;
  }

  // Absolute datetime: YYYY-MM-DD HH:MM
  const dtMatch = deadline.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
  if (dtMatch) {
    return new Date(`${dtMatch[1]}T${dtMatch[2]}:00`);
  }

  // Absolute date: YYYY-MM-DD
  const dateMatch = deadline.match(/^\d{4}-\d{2}-\d{2}$/);
  if (dateMatch) {
    return new Date(deadline + "T00:00:00");
  }

  return null;
}

/** Format a Date to a display string (YYYY/MM/DD). */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

/** Format a Date to YYYY/MM/DD HH:MM if it has a time component. */
export function formatDateTime(date: Date): string {
  const base = formatDate(date);
  const h = date.getHours();
  const min = date.getMinutes();
  if (h === 0 && min === 0) return base;
  return `${base} ${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
