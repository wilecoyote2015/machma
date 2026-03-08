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

/**
 * Resolve a task's effective start date for rendering/layout purposes.
 *
 * Implements the start-date refinement rules (rendering-only, never persisted):
 * - If start_date is set: resolve it normally via resolveDeadline.
 * - If start_time is set but start_date is not: use the deadline's date as the
 *   base (same day), then optionally apply the time component.
 * - If neither is set: return null (task has no start date).
 *
 * The optional `time` parameter controls whether the time-of-day component is
 * applied to the resolved date (pass start_time in day-view mode, undefined in
 * normal mode — mirrors the existing resolveDeadline convention).
 */
export function resolveStartDate(
  startDate: string,
  startTime: string,
  deadline: string,
  anchorDate: string,
  time?: string,
): Date | null {
  // start_date is explicitly set → resolve directly
  if (startDate.trim()) {
    return resolveDeadline(startDate, anchorDate, time);
  }

  // start_time is set without start_date → derive date from deadline
  if (startTime.trim()) {
    const deadlineDate = resolveDeadline(deadline, anchorDate);
    if (!deadlineDate) return null;

    const result = new Date(deadlineDate);
    result.setHours(0, 0, 0, 0);

    if (time?.trim()) {
      const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        result.setHours(parseInt(timeMatch[1]!, 10), parseInt(timeMatch[2]!, 10), 0, 0);
      }
    }
    return result;
  }

  return null;
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

/** Format only the time-of-day component of a Date as HH:MM. */
export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Snap a timestamp to the nearest midnight (local time).
 * Used for day-level snapping in normal timeline view.
 */
export function snapToDay(timeMs: number): Date {
  const date = new Date(timeMs);
  const hours = date.getHours();
  date.setHours(0, 0, 0, 0);
  if (hours >= 12) date.setDate(date.getDate() + 1);
  return date;
}

/**
 * Snap a timestamp to the nearest 15-minute boundary (local time).
 * Used for fine-grained snapping in day-view timeline mode.
 */
export function snapTo15Min(timeMs: number): Date {
  const date = new Date(timeMs);
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const snapped = Math.round(totalMinutes / 15) * 15;
  const hours = Math.floor(snapped / 60);
  const mins = snapped % 60;
  if (hours >= 24) {
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
  } else {
    date.setHours(hours, mins, 0, 0);
  }
  return date;
}
