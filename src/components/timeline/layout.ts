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
const TIMELINE_X = 0;
const NODES_START_X = 140;
const TIMELINE_PADDING_DAYS = 3;
const MIN_NODE_SPACING = 90;
const BASE_PIXELS_PER_DAY = 40;

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

  const start = new Date(minDate);
  start.setHours(0, 0, 0, 0);

  const ticks: Date[] = [];
  const cursor = new Date(start);
  const end = maxDate.getTime() + MS_PER_DAY;

  while (cursor.getTime() <= end) {
    ticks.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + intervalDays);
  }

  if (ticks.length < 2) {
    ticks.push(new Date(end));
  }

  return ticks;
}

/**
 * Build a smart Y-position mapper that dynamically scales based on task density.
 *
 * Strategy: compute a linear mapping from time to Y, then walk through sorted
 * task dates and push any that are too close (< MIN_NODE_SPACING) further apart.
 * The result is a piecewise-linear mapping stored as (time, y) control points.
 * Timeline ticks are placed using the same mapping so they stay aligned.
 */
function buildYMapper(taskDates: Date[], minTime: number, maxTime: number) {
  const rangeDays = (maxTime - minTime) / MS_PER_DAY;
  if (rangeDays === 0) {
    return (_time: number) => 0;
  }

  // Sort unique task times
  const sorted = [...new Set(taskDates.map((d) => d.getTime()))].sort((a, b) => a - b);

  // Build control points: start with base linear mapping, then enforce minimum spacing
  const points: { time: number; y: number }[] = [];
  let currentY = 0;

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i]!;
    const linearY = ((t - minTime) / MS_PER_DAY) * BASE_PIXELS_PER_DAY;
    const y = Math.max(linearY, currentY);
    points.push({ time: t, y });
    currentY = y + MIN_NODE_SPACING;
  }

  // If no tasks, fall back to pure linear
  if (points.length === 0) {
    return (time: number) => ((time - minTime) / MS_PER_DAY) * BASE_PIXELS_PER_DAY;
  }

  // Map arbitrary time to Y by interpolating between control points
  return (time: number): number => {
    if (time <= points[0]!.time) {
      // Before first task: use linear scale from origin
      const ratio = points[0]!.time === minTime ? 1 : points[0]!.y / (points[0]!.time - minTime);
      return Math.max(0, (time - minTime) * ratio);
    }
    if (time >= points[points.length - 1]!.time) {
      const last = points[points.length - 1]!;
      return last.y + ((time - last.time) / MS_PER_DAY) * BASE_PIXELS_PER_DAY;
    }
    // Find surrounding control points and interpolate
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;
      if (time >= a.time && time <= b.time) {
        const t = (time - a.time) / (b.time - a.time);
        return a.y + t * (b.y - a.y);
      }
    }
    return 0;
  };
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
  const maxTime = maxDate.getTime();

  // Build smart Y mapper that adapts spacing to task density
  const timeToY = buildYMapper(dates, minTime, maxTime);

  // ── Generate timeline tick nodes ──────────────────────────────────
  const tickDates = generateTickDates(minDate, maxDate);
  const tickNodes: Node<TimelineTickData>[] = tickDates.map((date, i) => ({
    id: `__tick_${i}`,
    type: "timelineTick",
    position: { x: TIMELINE_X, y: timeToY(date.getTime()) },
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
    ...(i === tickDates.length - 2
      ? { markerEnd: { type: "arrowclosed" as const, color: "#6B7280" } }
      : {}),
  }));

  // ── Task nodes ────────────────────────────────────────────────────
  const undatedY = timeToY(maxTime) + MIN_NODE_SPACING;

  const taskNodes: Node<TaskNodeData>[] = resolved.map(({ task, date }) => {
    const col = groupXIndex.get(task.group) ?? 0;
    const y = date ? timeToY(date.getTime()) : undatedY;

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
