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
 * If `time` is provided (HH:MM), it overrides the hour/minute on the resolved date.
 * This supports the separate time-of-day field on tasks.
 *
 * Returns null if the deadline string is empty or unparseable.
 */
export function resolveDeadline(
  deadline: string,
  anchorDate: string,
  time?: string,
): Date | null {
  if (!deadline.trim()) return null;

  let date: Date | null = null;

  // Relative offset: +Nd or -Nd
  const relMatch = deadline.match(/^([+-]?\d+)d$/);
  if (relMatch) {
    const days = parseInt(relMatch[1]!, 10);
    const anchor = new Date(anchorDate + "T00:00:00");
    anchor.setDate(anchor.getDate() + days);
    date = anchor;
  }

  // Absolute datetime: YYYY-MM-DD HH:MM
  if (!date) {
    const dtMatch = deadline.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
    if (dtMatch) {
      date = new Date(`${dtMatch[1]}T${dtMatch[2]}:00`);
    }
  }

  // Absolute date: YYYY-MM-DD
  if (!date) {
    const dateMatch = deadline.match(/^\d{4}-\d{2}-\d{2}$/);
    if (dateMatch) {
      date = new Date(deadline + "T00:00:00");
    }
  }

  // Apply separate time field if provided (overrides any time from the deadline string)
  if (date && time?.trim()) {
    const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      date.setHours(parseInt(timeMatch[1]!, 10), parseInt(timeMatch[2]!, 10), 0, 0);
    }
  }

  return date;
}

/** Format a Date to a display string (YYYY-MM-DD). */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format a Date to YYYY-MM-DD HH:MM if it has a non-zero time component. */
export function formatDateTime(date: Date): string {
  const base = formatDate(date);
  const h = date.getHours();
  const min = date.getMinutes();
  if (h === 0 && min === 0) return base;
  return `${base} ${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
