/**
 * Compute React Flow node positions from tasks, plus a vertical
 * timeline axis with date tick marks on the left.
 *
 * Layout strategy:
 * - Y-axis = time (earlier deadlines at the top, later at the bottom).
 *   Uses a density-aware mapper that stretches clusters and compresses gaps.
 * - X-axis = per-row compact packing with group affinity:
 *   1. Groups are ordered by dependency connectivity (connected groups adjacent).
 *   2. Each Y row is packed independently: groups placed left-to-right in order,
 *      each group's tasks forming a contiguous block.
 *   3. Between rows, groups try to stay at their previous X position (within a
 *      tolerance) for vertical alignment; if the gap would be too large, the
 *      group compacts toward the left.
 *   4. Initial group slot offsets are estimated from each group's peak density.
 * - Left side: vertical timeline axis with date ticks.
 * - Tasks without a deadline are placed below the last date.
 */

import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { Task, TaskGroup } from "@/types";
import { resolveDeadline, formatDate } from "@/lib/dates";
import { DEFAULT_GROUP_COLOR, AXIS_COLOR, EDGE_COLOR } from "@/lib/constants";
import { getInitials } from "@/lib/format";

/** Data payload attached to each task node */
export interface TaskNodeData extends Record<string, unknown> {
  task: Task;
  groupColor: string;
  resolvedDate: Date | null;
  hasUnresolvedIssues: boolean;
  hasUnansweredQuestions: boolean;
  assigneeName: string;
  /** Custom color for the assignee badge (from helper data) */
  assigneeColor: string;
}

/** Data payload for a timeline tick node */
export interface TimelineTickData extends Record<string, unknown> {
  label: string;
  isFirst: boolean;
  isLast: boolean;
}

/* ── Layout constants ────────────────────────────────────────────── */

/** Fixed rendered width of a task node (px). Shared with TaskNode.tsx. */
export const NODE_WIDTH = 180;
/** Estimated rendered height for overlap detection (px). */
const NODE_HEIGHT = 80;
/** Horizontal gap between adjacent nodes on the X grid (px). */
const NODE_X_GAP = 24;
/** One slot on the global X grid: node width + gap. */
const SLOT_WIDTH = NODE_WIDTH + NODE_X_GAP;
/**
 * Maximum number of empty grid slots tolerated between a group's previous-row
 * position and the next available slot. If the gap exceeds this, the group
 * compacts toward the left instead of preserving alignment.
 */
const MAX_ALIGNMENT_GAP = 2;
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
  /** Final pixel X position, assigned by `assignXPositions`. */
  x: number;
}

/** A placed node tracked for cross-row collision detection. */
interface PlacedRect {
  x: number;
  y: number;
}

/** Maximum number of days in the filter range that triggers hourly tick mode. */
const HOURLY_TICK_THRESHOLD_DAYS = 2;
/** Pixels per day in hourly/day-view mode (~80 px per hour). */
const DAY_VIEW_PIXELS_PER_DAY = 24 * 80;

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
 * at a sensible interval. Always includes a final tick at or past maxDate
 * so the axis arrow reaches the end of the date range.
 */
function generateTickDates(minDate: Date, maxDate: Date): Date[] {
  const rangeDays = (maxDate.getTime() - minDate.getTime()) / MS_PER_DAY;
  const intervalDays = chooseTickInterval(rangeDays);

  const start = new Date(minDate);
  start.setHours(0, 0, 0, 0);

  const ticks: Date[] = [];
  const cursor = new Date(start);
  const end = maxDate.getTime();

  while (cursor.getTime() <= end) {
    ticks.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + intervalDays);
  }

  // Always include a final tick past the end so the axis arrow extends
  // to or beyond the last task date (cursor is now past maxDate)
  ticks.push(new Date(cursor));

  return ticks;
}

/**
 * Generate hourly tick marks for day-view mode (filter range ≤ 2 days).
 * Produces one tick per hour spanning the full range, with midnight ticks
 * showing the date and others showing just the hour.
 */
function generateHourlyTickDates(minDate: Date, maxDate: Date): Date[] {
  const ticks: Date[] = [];
  const cursor = new Date(minDate);
  cursor.setMinutes(0, 0, 0);

  const end = maxDate.getTime();
  while (cursor.getTime() <= end) {
    ticks.push(new Date(cursor));
    cursor.setHours(cursor.getHours() + 1);
  }
  // Final tick past end so the axis arrow extends
  ticks.push(new Date(cursor));
  return ticks;
}

/** Format a tick label: full date for midnight, HH:00 for other hours. */
function formatHourlyTickLabel(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  if (h === 0 && m === 0) return `${formatDate(date)} 00:00`;
  return `${String(h).padStart(2, "0")}:00`;
}

/* ── Y-axis mapping ──────────────────────────────────────────────── */

/**
 * Build a smart Y-position mapper that dynamically scales based on task density.
 *
 * Strategy: compute a linear mapping from time to Y, then walk through sorted
 * task dates and push any that are too close (< MIN_NODE_SPACING) further apart.
 * The result is a piecewise-linear mapping stored as (time, y) control points.
 * Timeline ticks are placed using the same mapping so they stay aligned.
 *
 * @param pixelsPerDay - Base linear scale before density adjustment.
 *   Higher values give finer Y resolution (used for day-view mode).
 */
function buildYMapper(
  taskDates: Date[],
  minTime: number,
  maxTime: number,
  pixelsPerDay: number = BASE_PIXELS_PER_DAY,
) {
  const rangeDays = (maxTime - minTime) / MS_PER_DAY;
  if (rangeDays === 0) {
    return (_time: number) => 0;
  }

  const sorted = [...new Set(taskDates.map((d) => d.getTime()))].sort(
    (a, b) => a - b,
  );

  const points: { time: number; y: number }[] = [];
  let currentY = 0;

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i]!;
    const linearY = ((t - minTime) / MS_PER_DAY) * pixelsPerDay;
    const y = Math.max(linearY, currentY);
    points.push({ time: t, y });
    currentY = y + MIN_NODE_SPACING;
  }

  if (points.length === 0) {
    return (time: number) =>
      ((time - minTime) / MS_PER_DAY) * pixelsPerDay;
  }

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
      return last.y + ((time - last.time) / MS_PER_DAY) * pixelsPerDay;
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

  if (!hasCrossGroupDeps) return groupPaths;

  const origIdx = new Map(groupPaths.map((g, i) => [g, i]));

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

/* ── Per-row X position assignment ───────────────────────────────── */

/**
 * Estimate the peak number of simultaneous tasks per group (tasks sharing
 * the same Y level within NODE_HEIGHT tolerance). Used to seed the initial
 * group slot offsets before per-row packing adjusts them.
 */
function estimateGroupWidths(
  tasksByGroup: Map<string, TaskPlacement[]>,
): Map<string, number> {
  const result = new Map<string, number>();

  for (const [group, placements] of tasksByGroup) {
    if (placements.length === 0) {
      result.set(group, 1);
      continue;
    }

    const sorted = [...placements].sort((a, b) => a.y - b.y);
    let maxSim = 1;

    for (let i = 0; i < sorted.length; i++) {
      let count = 1;
      for (
        let j = i + 1;
        j < sorted.length && sorted[j]!.y - sorted[i]!.y < NODE_HEIGHT;
        j++
      ) {
        count++;
      }
      maxSim = Math.max(maxSim, count);
    }

    result.set(group, maxSim);
  }

  return result;
}

/**
 * Find the first contiguous block of `blockSize` free grid slots starting
 * from `startSlot`, avoiding positions listed in `occupiedXs`.
 * Searches forward only (increasing slot indices).
 */
function findFreeBlock(
  startSlot: number,
  blockSize: number,
  occupiedXs: number[],
): number {
  for (let slot = startSlot; slot < startSlot + 200; slot++) {
    let free = true;
    for (let k = 0; k < blockSize; k++) {
      const x = NODES_START_X + (slot + k) * SLOT_WIDTH;
      if (occupiedXs.some((ox) => Math.abs(ox - x) < SLOT_WIDTH)) {
        free = false;
        break;
      }
    }
    if (free) return slot;
  }
  return startSlot;
}

/**
 * Assign pixel X positions to all tasks using per-row compact packing.
 *
 * Each Y row (set of tasks at the same Y level) is packed independently:
 * groups are placed left-to-right in their global order, with each group's
 * tasks forming a contiguous block of grid slots.
 *
 * Between rows, alignment continuity is maintained: a group's block tries to
 * start at its previous-row slot position. If the gap to that position exceeds
 * MAX_ALIGNMENT_GAP, the group compacts toward the left instead.
 *
 * Initial group offsets are seeded from `estimateGroupWidths` so that the
 * first row gets reasonable initial positions without collisions.
 */
function assignXPositions(
  allPlacements: TaskPlacement[],
  sortedGroupPaths: string[],
  tasksByGroup: Map<string, TaskPlacement[]>,
): void {
  const groupOrder = new Map(
    sortedGroupPaths.map((g, i) => [g, i]),
  );

  // Seed initial slot offsets from each group's peak density
  const widths = estimateGroupWidths(tasksByGroup);
  const groupPrevSlot = new Map<string, number>();
  let seedOffset = 0;
  for (const gp of sortedGroupPaths) {
    groupPrevSlot.set(gp, seedOffset);
    seedOffset += widths.get(gp) ?? 1;
  }

  // Cross-row collision tracking
  const allPlaced: PlacedRect[] = [];

  // Sort tasks by Y for row-based processing
  allPlacements.sort((a, b) => a.y - b.y);

  let idx = 0;
  while (idx < allPlacements.length) {
    // ── Collect one Y-level batch ────────────────────────────────────
    const rowY = allPlacements[idx]!.y;
    const rowStart = idx;
    while (
      idx < allPlacements.length &&
      Math.abs(allPlacements[idx]!.y - rowY) < 1
    ) {
      idx++;
    }
    const row = allPlacements.slice(rowStart, idx);

    // Group this row's tasks by group path
    const rowByGroup = new Map<string, TaskPlacement[]>();
    for (const p of row) {
      const arr = rowByGroup.get(p.task.group) ?? [];
      arr.push(p);
      rowByGroup.set(p.task.group, arr);
    }

    // Groups present in this row, sorted by global order
    const rowGroups = [...rowByGroup.keys()].sort(
      (a, b) => (groupOrder.get(a) ?? 0) - (groupOrder.get(b) ?? 0),
    );

    // X positions occupied by tasks in nearby previous rows
    const crossRowOccupied = allPlaced
      .filter((p) => Math.abs(p.y - rowY) < NODE_HEIGHT)
      .map((p) => p.x);

    // Working set: cross-row + current row (updated as groups are placed)
    const rowOccupied = [...crossRowOccupied];

    // ── Pack groups left-to-right ────────────────────────────────────
    let minNextSlot = 0;

    for (const gp of rowGroups) {
      const tasks = rowByGroup.get(gp)!;
      const blockSize = tasks.length;

      const prevSlot = groupPrevSlot.get(gp) ?? minNextSlot;
      let targetSlot: number;

      if (prevSlot >= minNextSlot && prevSlot - minNextSlot <= MAX_ALIGNMENT_GAP) {
        // Previous position reachable within tolerance → preserve alignment
        targetSlot = prevSlot;
      } else {
        // Gap too large or previous position behind → compact
        targetSlot = minNextSlot;
      }

      const startSlot = findFreeBlock(targetSlot, blockSize, rowOccupied);

      // Place each task in consecutive slots within the block
      for (let k = 0; k < blockSize; k++) {
        const x = NODES_START_X + (startSlot + k) * SLOT_WIDTH;
        tasks[k]!.x = x;
        rowOccupied.push(x);
        allPlaced.push({ x, y: rowY });
      }

      groupPrevSlot.set(gp, startSlot);
      minNextSlot = startSlot + blockSize;
    }
  }
}

/* ── Main layout entry point ─────────────────────────────────────── */

/** Deadline filter range passed from the store to enable day-view mode. */
export interface DeadlineRange {
  start: string | null;
  end: string | null;
}

/**
 * Determine if the deadline filter range is short enough for day-view mode.
 * Returns the range in days, or null if the range is open-ended.
 */
function deadlineRangeDays(range: DeadlineRange | undefined): number | null {
  if (!range?.start || !range?.end) return null;
  const start = new Date(range.start + "T00:00:00").getTime();
  const end = new Date(range.end + "T23:59:59").getTime();
  return (end - start) / MS_PER_DAY;
}

/**
 * Build React Flow nodes and edges from tasks, groups, and the anchor date.
 * Includes timeline tick nodes and the vertical axis edges.
 *
 * The timeline axis (Y mapping, date range, ticks) is normally derived from
 * `allTasks` so it stays stable across filter changes and the user keeps
 * temporal orientation. Only `filteredTasks` are rendered as visible nodes.
 *
 * When the deadline filter range covers ≤ 2 days ("day-view mode"), the axis
 * switches to the filtered range with hourly ticks and much higher Y resolution
 * so tasks at different times of day have visually distinct vertical positions.
 */
export function computeLayout(
  filteredTasks: Task[],
  allTasks: Task[],
  groups: TaskGroup[],
  anchorDate: string,
  helpers: Record<string, { name: string; color?: string }>,
  deadlineRange?: DeadlineRange,
): { nodes: Node[]; edges: Edge[] } {
  const groupColorMap = new Map(groups.map((g) => [g.path, g.meta.color]));

  // Detect day-view mode: filter range ≤ 2 days
  const rangeDays = deadlineRangeDays(deadlineRange);
  const isDayView = rangeDays !== null && rangeDays <= HOURLY_TICK_THRESHOLD_DAYS;

  // Resolve deadlines for ALL tasks (stable Y mapping and timeline axis).
  // In normal mode, omit task.time so same-day tasks share a Y position.
  // In day-view mode, include task.time for hourly Y resolution.
  const allDates = allTasks
    .map((t) => resolveDeadline(t.deadline, anchorDate, isDayView ? t.time : undefined))
    .filter((d): d is Date => d !== null);

  // Resolve deadlines for filtered tasks (visible nodes)
  const filteredResolved = filteredTasks.map((t) => ({
    task: t,
    date: resolveDeadline(t.deadline, anchorDate, isDayView ? t.time : undefined),
  }));

  // No dates across ALL tasks → fall back to simple vertical layout for filtered tasks
  if (allDates.length === 0 && filteredTasks.length > 0) {
    const nodes: Node<TaskNodeData>[] = filteredResolved.map(({ task }, i) => ({
      id: task.id,
      type: "taskNode",
      position: { x: NODES_START_X, y: i * 100 },
      data: buildTaskNodeData(task, groupColorMap, helpers, anchorDate),
    }));
    return { nodes, edges: buildDependencyEdges(filteredTasks) };
  }

  if (allDates.length === 0) return { nodes: [], edges: [] };

  // ── Choose axis range and scale ───────────────────────────────────
  let minDate: Date;
  let maxDate: Date;
  let effectivePixelsPerDay: number;

  if (isDayView && deadlineRange!.start && deadlineRange!.end) {
    // Day-view: axis covers the filter range with high-resolution Y mapping
    minDate = new Date(deadlineRange!.start + "T00:00:00");
    maxDate = new Date(deadlineRange!.end + "T23:59:59");
    effectivePixelsPerDay = DAY_VIEW_PIXELS_PER_DAY;
  } else {
    // Normal: axis covers all tasks with padding
    const rawMinTime = Math.min(...allDates.map((d) => d.getTime()));
    const rawMaxTime = Math.max(...allDates.map((d) => d.getTime()));
    minDate = new Date(rawMinTime - TIMELINE_PADDING_DAYS * MS_PER_DAY);
    maxDate = new Date(rawMaxTime + TIMELINE_PADDING_DAYS * MS_PER_DAY);
    effectivePixelsPerDay = BASE_PIXELS_PER_DAY;
  }

  const minTime = minDate.getTime();
  const maxTime = maxDate.getTime();

  // Y mapper uses filtered tasks' dates in day-view (high resolution)
  // and all tasks' dates in normal mode (stable axis)
  const yMapperDates = isDayView
    ? filteredResolved.map((r) => r.date).filter((d): d is Date => d !== null)
    : allDates;

  const timeToY = buildYMapper(yMapperDates, minTime, maxTime, effectivePixelsPerDay);
  const undatedY = timeToY(maxTime) + MIN_NODE_SPACING;

  // ── Build placements for filtered tasks only ──────────────────────
  const placements: TaskPlacement[] = [];
  const tasksByGroup = new Map<string, TaskPlacement[]>();

  for (const { task, date } of filteredResolved) {
    const y = date ? timeToY(date.getTime()) : undatedY;
    const p: TaskPlacement = { task, y, date, x: NODES_START_X };
    placements.push(p);

    const arr = tasksByGroup.get(task.group) ?? [];
    arr.push(p);
    tasksByGroup.set(task.group, arr);
  }

  // ── Order groups by dependency connectivity ───────────────────────
  const groupPaths = [...tasksByGroup.keys()];
  const sortedGroupPaths = orderGroupsByConnectivity(groupPaths, filteredTasks);

  // ── Assign X positions via per-row compact packing ────────────────
  if (placements.length > 0) {
    assignXPositions(placements, sortedGroupPaths, tasksByGroup);
  }

  // ── Build task nodes ──────────────────────────────────────────────
  const taskNodes: Node<TaskNodeData>[] = placements.map((p) => ({
    id: p.task.id,
    type: "taskNode",
    position: { x: p.x, y: p.y },
    data: buildTaskNodeData(p.task, groupColorMap, helpers, anchorDate),
  }));

  // ── Generate timeline tick nodes ──────────────────────────────────
  let tickDates: Date[];
  let tickLabels: string[];

  if (isDayView) {
    tickDates = generateHourlyTickDates(minDate, maxDate);
    tickLabels = tickDates.map(formatHourlyTickLabel);
  } else {
    tickDates = generateTickDates(minDate, maxDate);
    tickLabels = tickDates.map(formatDate);
  }

  const tickNodes: Node<TimelineTickData>[] = tickDates.map((date, i) => ({
    id: `__tick_${i}`,
    type: "timelineTick",
    position: { x: TIMELINE_X, y: timeToY(date.getTime()) },
    data: {
      label: tickLabels[i]!,
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
    deletable: false,
    ...(i === tickDates.length - 2
      ? { markerEnd: { type: "arrowclosed" as const, color: AXIS_COLOR } }
      : {}),
  }));

  return {
    nodes: [...tickNodes, ...taskNodes],
    edges: [...tickEdges, ...buildDependencyEdges(filteredTasks)],
  };
}

/* ── Shared helpers ──────────────────────────────────────────────── */

/** Build the data payload for a single task node. */
function buildTaskNodeData(
  task: Task,
  groupColorMap: Map<string, string>,
  helpers: Record<string, { name: string; color?: string }>,
  anchorDate: string,
): TaskNodeData {
  const hasUnresolvedIssues = task.issues.some(
    (issue) => !issue.assignee && !issue.solution,
  );
  const hasUnansweredQuestions = task.questions.some(
    (q) => !q.answer.trim(),
  );

  const helper = task.assignee ? helpers[task.assignee] : undefined;
  const assigneeName = helper ? getInitials(helper.name) : task.assignee;
  const assigneeColor = helper?.color ?? "";

  return {
    task,
    groupColor: groupColorMap.get(task.group) ?? DEFAULT_GROUP_COLOR,
    resolvedDate: resolveDeadline(task.deadline, anchorDate, task.time),
    hasUnresolvedIssues,
    hasUnansweredQuestions,
    assigneeName,
    assigneeColor,
  };
}

/**
 * Build dependency edges between tasks.
 *
 * Each edge is colored by the **source** (parent/dependency) task's status
 * so the user can immediately see which blocking tasks are done, in progress,
 * or cancelled.  An arrowhead in the matching color indicates direction.
 */
function buildDependencyEdges(tasks: Task[]): Edge[] {
  const taskStatusMap = new Map(tasks.map((t) => [t.id, t.status]));
  const edges: Edge[] = [];

  for (const task of tasks) {
    for (const depId of task.depends_on) {
      // Skip edges to tasks not in the current set (e.g. filtered out)
      if (!taskStatusMap.has(depId)) continue;

      const sourceStatus = taskStatusMap.get(depId)!;
      const color = EDGE_COLOR[sourceStatus] ?? EDGE_COLOR.todo!;

      edges.push({
        id: `${depId}->${task.id}`,
        source: depId,
        target: task.id,
        style: { strokeDasharray: "6 3", stroke: color, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 18,
          height: 18,
        },
        deletable: true,
      });
    }
  }
  return edges;
}
