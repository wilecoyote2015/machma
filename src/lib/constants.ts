/**
 * Shared constants used across the application.
 * Color hex values here are for use in non-CSS contexts
 * (e.g. React Flow node data, inline styles).
 */

import type { TaskStatus } from "@/types";

// ── Colors ──────────────────────────────────────────────────────────

/** Default group color when no group.json is present (gray-400) */
export const DEFAULT_GROUP_COLOR = "#9CA3AF";

/** Default helper/assignee badge color when no custom color is set (green-700) */
export const DEFAULT_ASSIGNEE_COLOR = "#15803d";

/** Color used for the timeline axis line */
export const AXIS_COLOR = "#6B7280";

/** Dependency edge colors keyed by source (parent) task status */
export const EDGE_COLOR: Record<string, string> = {
  todo: "#6B7280",        // gray-500  — not yet started
  in_progress: "#EAB308", // yellow-500 — actively being worked on
  finished: "#22C55E",    // green-500  — completed
  cancelled: "#EF4444",   // red-500    — cancelled
};

// ── Task statuses ───────────────────────────────────────────────────

/** Canonical ordered list of all task statuses */
export const TASK_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "finished",
  "cancelled",
];

/** Status options formatted for FilterToggleGroup (label + value) */
export const TASK_STATUS_OPTIONS: { label: string; value: TaskStatus }[] =
  TASK_STATUSES.map((s) => ({ label: formatStatus(s), value: s }));

/** Convert a status identifier to a human-readable label (e.g. "in_progress" → "in progress") */
export function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

// ── Sentinels ───────────────────────────────────────────────────────

/** Sentinel value used as the "New group…" option in group dropdowns */
export const NEW_GROUP_SENTINEL = "__new_group__";
