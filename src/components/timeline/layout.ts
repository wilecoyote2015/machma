/**
 * Compute React Flow node positions from tasks, plus a vertical
 * timeline axis with date tick marks on the left.
 *
 * Layout strategy:
 * - Y-axis = time (earlier deadlines at the top, later at the bottom)
 * - X-axis = group columns (each group gets a horizontal band)
 * - Left side: vertical timeline axis with date ticks
 * - Tasks without a deadline are placed below the last date
 */

import type { Node, Edge } from "@xyflow/react";
import type { Task, TaskGroup } from "@/types";
import { resolveDeadline, formatDate } from "@/lib/dates";

/** Data payload attached to each task node */
export interface TaskNodeData extends Record<string, unknown> {
  task: Task;
  groupColor: string;
  resolvedDate: Date | null;
  hasUnresolvedIssues: boolean;
  hasUnansweredQuestions: boolean;
  assigneeName: string;
}

/** Data payload for a timeline tick node */
export interface TimelineTickData extends Record<string, unknown> {
  label: string;
  isFirst: boolean;
  isLast: boolean;
}

const GROUP_GAP = 220;
const Y_PIXELS_PER_DAY = 60;
const TIMELINE_X = 0;
const NODES_START_X = 140;
const TIMELINE_PADDING_DAYS = 3;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Choose a tick interval (in days) that produces a readable number of ticks
 * for the given date range.
 */
function chooseTickInterval(rangeDays: number): number {
  if (rangeDays <= 14) return 1;
  if (rangeDays <= 30) return 7;
  if (rangeDays <= 90) return 14;
  return 30;
}

/**
 * Generate an array of dates for tick marks, spanning the full range
 * at a sensible interval.
 */
function generateTickDates(minDate: Date, maxDate: Date): Date[] {
  const rangeDays = (maxDate.getTime() - minDate.getTime()) / MS_PER_DAY;
  const intervalDays = chooseTickInterval(rangeDays);

  // Align the first tick to the start of the range (floored to interval boundary)
  const start = new Date(minDate);
  start.setHours(0, 0, 0, 0);

  const ticks: Date[] = [];
  const cursor = new Date(start);
  const end = maxDate.getTime() + MS_PER_DAY; // include the max date

  while (cursor.getTime() <= end) {
    ticks.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + intervalDays);
  }

  // Ensure at least 2 ticks
  if (ticks.length < 2) {
    ticks.push(new Date(end));
  }

  return ticks;
}

/** Convert a date to a Y position given a reference minimum date. */
function dateToY(date: Date, minTime: number): number {
  return ((date.getTime() - minTime) / MS_PER_DAY) * Y_PIXELS_PER_DAY;
}

/**
 * Build React Flow nodes and edges from tasks, groups, and the anchor date.
 * Includes timeline tick nodes and the vertical axis edges.
 */
export function computeLayout(
  tasks: Task[],
  groups: TaskGroup[],
  anchorDate: string,
  helpers: Record<string, { name: string }>,
): { nodes: Node[]; edges: Edge[] } {
  // Assign each group an x-column index
  const groupPaths = [...new Set(tasks.map((t) => t.group))];
  const sortedGroupPaths = groupPaths.sort((a, b) => {
    const ai = groups.findIndex((g) => g.path === a);
    const bi = groups.findIndex((g) => g.path === b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  const groupXIndex = new Map(sortedGroupPaths.map((p, i) => [p, i]));
  const groupColorMap = new Map(groups.map((g) => [g.path, g.meta.color]));

  // Resolve all deadlines
  const resolved = tasks.map((t) => ({
    task: t,
    date: resolveDeadline(t.deadline, anchorDate),
  }));

  const dates = resolved
    .map((r) => r.date)
    .filter((d): d is Date => d !== null);

  if (dates.length === 0) {
    // No dates at all — just position nodes in a column, no timeline
    const nodes: Node<TaskNodeData>[] = resolved.map(({ task }, i) => ({
      id: task.id,
      type: "taskNode",
      position: { x: NODES_START_X, y: i * 100 },
      data: buildTaskNodeData(task, groupColorMap, helpers, anchorDate),
    }));
    return { nodes, edges: buildDependencyEdges(tasks) };
  }

  // Compute time range with padding
  const rawMinTime = Math.min(...dates.map((d) => d.getTime()));
  const rawMaxTime = Math.max(...dates.map((d) => d.getTime()));
  const minDate = new Date(rawMinTime - TIMELINE_PADDING_DAYS * MS_PER_DAY);
  const maxDate = new Date(rawMaxTime + TIMELINE_PADDING_DAYS * MS_PER_DAY);
  const minTime = minDate.getTime();

  // ── Generate timeline tick nodes ──────────────────────────────────
  const tickDates = generateTickDates(minDate, maxDate);
  const tickNodes: Node<TimelineTickData>[] = tickDates.map((date, i) => ({
    id: `__tick_${i}`,
    type: "timelineTick",
    position: { x: TIMELINE_X, y: dateToY(date, minTime) },
    data: {
      label: formatDate(date),
      isFirst: i === 0,
      isLast: i === tickDates.length - 1,
    },
    selectable: false,
    draggable: false,
    focusable: false,
    connectable: false,
  }));

  // ── Timeline axis edges (vertical line segments between ticks) ────
  const tickEdges: Edge[] = tickDates.slice(0, -1).map((_, i) => ({
    id: `__tick_edge_${i}`,
    source: `__tick_${i}`,
    target: `__tick_${i + 1}`,
    type: "straight",
    style: { stroke: "#6B7280", strokeWidth: 2 },
    selectable: false,
    focusable: false,
    // Arrow on the last segment only
    ...(i === tickDates.length - 2
      ? { markerEnd: { type: "arrowclosed" as const, color: "#6B7280" } }
      : {}),
  }));

  // ── Task nodes ────────────────────────────────────────────────────
  const undatedY =
    dateToY(maxDate, minTime) + TIMELINE_PADDING_DAYS * Y_PIXELS_PER_DAY;

  const taskNodes: Node<TaskNodeData>[] = resolved.map(({ task, date }) => {
    const col = groupXIndex.get(task.group) ?? 0;
    const y = date ? dateToY(date, minTime) : undatedY;

    return {
      id: task.id,
      type: "taskNode",
      position: { x: NODES_START_X + col * GROUP_GAP, y },
      data: buildTaskNodeData(task, groupColorMap, helpers, anchorDate),
    };
  });

  const nodes: Node[] = [...tickNodes, ...taskNodes];
  const edges: Edge[] = [...tickEdges, ...buildDependencyEdges(tasks)];

  return { nodes, edges };
}

/** Build the data payload for a single task node. */
function buildTaskNodeData(
  task: Task,
  groupColorMap: Map<string, string>,
  helpers: Record<string, { name: string }>,
  anchorDate: string,
): TaskNodeData {
  const hasUnresolvedIssues = task.issues.some(
    (issue) => !issue.assignee && !issue.solution,
  );
  const hasUnansweredQuestions = task.questions.some(
    (q) => !q.answer.trim(),
  );

  const helper = task.assignee ? helpers[task.assignee] : undefined;
  const assigneeName = helper
    ? helper.name
        .split(" ")
        .map((w) => w[0])
        .join(".")
        .toUpperCase()
    : task.assignee;

  return {
    task,
    groupColor: groupColorMap.get(task.group) ?? "#9CA3AF",
    resolvedDate: resolveDeadline(task.deadline, anchorDate),
    hasUnresolvedIssues,
    hasUnansweredQuestions,
    assigneeName,
  };
}

/** Build dependency edges between tasks. */
function buildDependencyEdges(tasks: Task[]): Edge[] {
  const edges: Edge[] = [];
  for (const task of tasks) {
    for (const depId of task.depends_on) {
      edges.push({
        id: `${depId}->${task.id}`,
        source: depId,
        target: task.id,
        style: { strokeDasharray: "6 3", stroke: "#6B7280" },
      });
    }
  }
  return edges;
}
