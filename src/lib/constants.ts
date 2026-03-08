/**
 * Shared constants used across the application.
 * Color hex values here are for use in non-CSS contexts
 * (e.g. React Flow node data, inline styles).
 */

/** Default group color when no group.json is present (gray-400) */
export const DEFAULT_GROUP_COLOR = "#9CA3AF";

/** Color used for the timeline axis line */
export const AXIS_COLOR = "#6B7280";

/** Dependency edge colors keyed by source (parent) task status */
export const EDGE_COLOR: Record<string, string> = {
  todo: "#6B7280",        // gray-500  — not yet started
  in_progress: "#EAB308", // yellow-500 — actively being worked on
  finished: "#22C55E",    // green-500  — completed
  cancelled: "#EF4444",   // red-500    — cancelled
};
