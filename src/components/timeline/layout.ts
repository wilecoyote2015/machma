/**
 * Compute React Flow node positions from tasks, plus a vertical
 * timeline axis with date tick marks on the left.
 *
 * Layout strategy:
 * - Y-axis = time (earlier deadlines at the top, later at the bottom).
 *   Uses a density-aware mapper that stretches clusters and compresses gaps.
 * - X-axis = intelligent group-based lanes with collision avoidance:
 *   1. Groups are ordered by dependency connectivity (connected groups adjacent).
 *   2. Within each group, tasks are assigned to sub-lanes to prevent overlaps.
 *   3. Same-group dependency chains prefer the same lane for vertical alignment.
 *   4. Each group's horizontal band width adapts to its required sub-lanes.
 * - Left side: vertical timeline axis with date ticks.
 * - Tasks without a deadline are placed below the last date.
 */

import type { Node, Edge } from "@xyflow/react";
import type { Task, TaskGroup } from "@/types";
import { resolveDeadline, formatDate } from "@/lib/dates";
import { DEFAULT_GROUP_COLOR, AXIS_COLOR } from "@/lib/constants";

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

/* ── Layout constants ────────────────────────────────────────────── */

/** Estimated rendered width of a task node (px). */
const NODE_WIDTH = 180;
/** Estimated rendered height for overlap detection (px). */
const NODE_HEIGHT = 80;
/** Horizontal gap between sub-lanes within the same group (px). */
const SUBCOL_GAP = 24;
/** Horizontal gap between adjacent group bands (px). */
const GROUP_BAND_GAP = 50;
/** X position of the timeline axis. */
const TIMELINE_X = 0;
/** X offset where the first group band begins (right of the tick labels). */
const NODES_START_X = 140;
/** Days of padding added before the earliest and after the latest task date. */
const TIMELINE_PADDING_DAYS = 3;
/** Minimum Y spacing (px) enforced between tasks at different dates. */
const MIN_NODE_SPACING = 90;
/** Base linear scale before density adjustment. */
const BASE_PIXELS_PER_DAY = 40;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/* ── Internal types ──────────────────────────────────────────────── */

/** Intermediate placement state for a task during layout computation. */
interface TaskPlacement {
  task: Task;
  y: number;
  date: Date | null;
  lane: number;
}

/* ── Timeline tick helpers ───────────────────────────────────────── */

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

/* ── Y-axis mapping ──────────────────────────────────────────────── */

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
  const sorted = [...new Set(taskDates.map((d) => d.getTime()))].sort(
    (a, b) => a - b,
  );

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
    return (time: number) =>
      ((time - minTime) / MS_PER_DAY) * BASE_PIXELS_PER_DAY;
  }

  // Map arbitrary time to Y by interpolating between control points
  return (time: number): number => {
    if (time <= points[0]!.time) {
      const ratio =
        points[0]!.time === minTime
          ? 1
          : points[0]!.y / (points[0]!.time - minTime);
      return Math.max(0, (time - minTime) * ratio);
    }
    if (time >= points[points.length - 1]!.time) {
      const last = points[points.length - 1]!;
      return last.y + ((time - last.time) / MS_PER_DAY) * BASE_PIXELS_PER_DAY;
    }
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

/* ── Group ordering ──────────────────────────────────────────────── */

/**
 * Order groups so that groups with cross-group dependencies are placed adjacent.
 *
 * Uses a greedy approach: start with the most connected group, then iteratively
 * add the group with the strongest connection to already-placed groups.
 * Falls back to the input order when there are no cross-group dependencies.
 */
function orderGroupsByConnectivity(
  groupPaths: string[],
  tasks: Task[],
): string[] {
  if (groupPaths.length <= 1) return groupPaths;

  const taskGroupMap = new Map(tasks.map((t) => [t.id, t.group]));

  // Build symmetric adjacency weights between groups
  const weights = new Map<string, Map<string, number>>();
  for (const g of groupPaths) weights.set(g, new Map());

  let hasCrossGroupDeps = false;
  for (const task of tasks) {
    for (const depId of task.depends_on) {
      const depGroup = taskGroupMap.get(depId);
      if (depGroup && depGroup !== task.group) {
        hasCrossGroupDeps = true;
        const fwd = weights.get(task.group)!;
        fwd.set(depGroup, (fwd.get(depGroup) ?? 0) + 1);
        const bwd = weights.get(depGroup)!;
        bwd.set(task.group, (bwd.get(task.group) ?? 0) + 1);
      }
    }
  }

  // No cross-group dependencies → keep original order
  if (!hasCrossGroupDeps) return groupPaths;

  // Original index used as a stable tie-breaker
  const origIdx = new Map(groupPaths.map((g, i) => [g, i]));

  // Seed with the most-connected group
  let startGroup = groupPaths[0]!;
  let maxTotal = 0;
  for (const g of groupPaths) {
    const total = [...(weights.get(g)?.values() ?? [])].reduce(
      (a, b) => a + b,
      0,
    );
    if (
      total > maxTotal ||
      (total === maxTotal &&
        (origIdx.get(g) ?? 0) < (origIdx.get(startGroup) ?? 0))
    ) {
      maxTotal = total;
      startGroup = g;
    }
  }

  const ordered: string[] = [startGroup];
  const remaining = new Set(groupPaths.filter((g) => g !== startGroup));

  while (remaining.size > 0) {
    let bestNext = "";
    let bestScore = -1;

    for (const g of remaining) {
      let score = 0;
      for (const placed of ordered) {
        score += weights.get(g)?.get(placed) ?? 0;
      }
      if (
        bestNext === "" ||
        score > bestScore ||
        (score === bestScore &&
          (origIdx.get(g) ?? 999) < (origIdx.get(bestNext) ?? 999))
      ) {
        bestScore = score;
        bestNext = g;
      }
    }

    ordered.push(bestNext);
    remaining.delete(bestNext);
  }

  return ordered;
}

/* ── Per-group lane assignment ───────────────────────────────────── */

/**
 * Assign sub-lanes within a single group to prevent vertical overlaps.
 *
 * Uses a greedy interval-scheduling approach: process tasks in ascending Y order,
 * assigning each to the first lane where it fits (no vertical collision).
 * For tasks with same-group dependencies, the dependency's lane is tried first
 * so that related tasks stay vertically aligned.
 *
 * @param placements - Tasks in this group (mutated: .lane is set, array is sorted by Y).
 * @param taskLaneMap - Shared map from task ID → assigned lane (populated incrementally).
 * @param taskGroupMap - Map from task ID → group path for same-group checks.
 * @returns Number of lanes used by this group.
 */
function assignGroupLanes(
  placements: TaskPlacement[],
  taskLaneMap: Map<string, number>,
  taskGroupMap: Map<string, string>,
): number {
  if (placements.length === 0) return 0;

  // Sort by Y so we can greedily schedule top-to-bottom
  placements.sort((a, b) => a.y - b.y);

  // Track the Y at which each lane becomes free again
  const laneEndY: number[] = [];

  for (const p of placements) {
    // ── Dependency-aware preference: try the same lane as a same-group dependency ──
    let preferredLane = -1;
    for (const depId of p.task.depends_on) {
      if (
        taskGroupMap.get(depId) === p.task.group &&
        taskLaneMap.has(depId)
      ) {
        preferredLane = taskLaneMap.get(depId)!;
        break;
      }
    }

    if (
      preferredLane >= 0 &&
      preferredLane < laneEndY.length &&
      p.y >= laneEndY[preferredLane]!
    ) {
      p.lane = preferredLane;
      laneEndY[preferredLane] = p.y + NODE_HEIGHT;
      taskLaneMap.set(p.task.id, p.lane);
      continue;
    }

    // ── Fallback: first available lane ──
    let assigned = false;
    for (let lane = 0; lane < laneEndY.length; lane++) {
      if (p.y >= laneEndY[lane]!) {
        p.lane = lane;
        laneEndY[lane] = p.y + NODE_HEIGHT;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      p.lane = laneEndY.length;
      laneEndY.push(p.y + NODE_HEIGHT);
    }

    taskLaneMap.set(p.task.id, p.lane);
  }

  return laneEndY.length;
}

/* ── Main layout entry point ─────────────────────────────────────── */

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
  const groupColorMap = new Map(groups.map((g) => [g.path, g.meta.color]));

  // Resolve all deadlines
  const resolved = tasks.map((t) => ({
    task: t,
    date: resolveDeadline(t.deadline, anchorDate),
  }));

  const dates = resolved
    .map((r) => r.date)
    .filter((d): d is Date => d !== null);

  if (dates.length === 0 && tasks.length > 0) {
    // No dates at all — position nodes in a simple vertical column
    const nodes: Node<TaskNodeData>[] = resolved.map(({ task }, i) => ({
      id: task.id,
      type: "taskNode",
      position: { x: NODES_START_X, y: i * 100 },
      data: buildTaskNodeData(task, groupColorMap, helpers, anchorDate),
    }));
    return { nodes, edges: buildDependencyEdges(tasks) };
  }

  if (tasks.length === 0) return { nodes: [], edges: [] };

  // ── Y positions via smart date mapping ────────────────────────────
  const rawMinTime = Math.min(...dates.map((d) => d.getTime()));
  const rawMaxTime = Math.max(...dates.map((d) => d.getTime()));
  const minDate = new Date(rawMinTime - TIMELINE_PADDING_DAYS * MS_PER_DAY);
  const maxDate = new Date(rawMaxTime + TIMELINE_PADDING_DAYS * MS_PER_DAY);
  const minTime = minDate.getTime();
  const maxTime = maxDate.getTime();
  const timeToY = buildYMapper(dates, minTime, maxTime);
  const undatedY = timeToY(maxTime) + MIN_NODE_SPACING;

  // ── Build placements with Y positions per group ───────────────────
  const tasksByGroup = new Map<string, TaskPlacement[]>();
  for (const { task, date } of resolved) {
    const y = date ? timeToY(date.getTime()) : undatedY;
    const arr = tasksByGroup.get(task.group) ?? [];
    arr.push({ task, y, date, lane: 0 });
    tasksByGroup.set(task.group, arr);
  }

  // ── Order groups by dependency connectivity ───────────────────────
  const groupPaths = [...tasksByGroup.keys()];
  const sortedGroupPaths = orderGroupsByConnectivity(groupPaths, tasks);

  // ── Assign sub-lanes per group (collision avoidance) ──────────────
  const taskGroupMap = new Map(tasks.map((t) => [t.id, t.group]));
  const taskLaneMap = new Map<string, number>();
  const groupLaneCounts = new Map<string, number>();

  for (const gp of sortedGroupPaths) {
    const placements = tasksByGroup.get(gp) ?? [];
    const numLanes = assignGroupLanes(placements, taskLaneMap, taskGroupMap);
    groupLaneCounts.set(gp, Math.max(numLanes, 1));
  }

  // ── Compute group band X offsets (dynamic widths) ─────────────────
  const groupBandStart = new Map<string, number>();
  let currentX = NODES_START_X;

  for (const gp of sortedGroupPaths) {
    groupBandStart.set(gp, currentX);
    const numLanes = groupLaneCounts.get(gp)!;
    const bandWidth =
      numLanes * NODE_WIDTH + Math.max(0, numLanes - 1) * SUBCOL_GAP;
    currentX += bandWidth + GROUP_BAND_GAP;
  }

  // ── Build task nodes with final positions ─────────────────────────
  const taskNodes: Node<TaskNodeData>[] = [];
  for (const [groupPath, placements] of tasksByGroup) {
    const bandStart = groupBandStart.get(groupPath)!;
    for (const p of placements) {
      const x = bandStart + p.lane * (NODE_WIDTH + SUBCOL_GAP);
      taskNodes.push({
        id: p.task.id,
        type: "taskNode",
        position: { x, y: p.y },
        data: buildTaskNodeData(p.task, groupColorMap, helpers, anchorDate),
      });
    }
  }

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
    style: { stroke: AXIS_COLOR, strokeWidth: 2 },
    selectable: false,
    focusable: false,
    ...(i === tickDates.length - 2
      ? { markerEnd: { type: "arrowclosed" as const, color: AXIS_COLOR } }
      : {}),
  }));

  return {
    nodes: [...tickNodes, ...taskNodes],
    edges: [...tickEdges, ...buildDependencyEdges(tasks)],
  };
}

/* ── Shared helpers ──────────────────────────────────────────────── */

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
    groupColor: groupColorMap.get(task.group) ?? DEFAULT_GROUP_COLOR,
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
        style: { strokeDasharray: "6 3", stroke: AXIS_COLOR },
      });
    }
  }
  return edges;
}
