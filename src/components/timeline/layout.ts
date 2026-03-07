/**
 * Compute React Flow node positions from tasks.
 *
 * Layout strategy:
 * - Y-axis = time (earlier deadlines at the top, later at the bottom)
 * - X-axis = group columns (each group gets a horizontal band)
 * - Tasks without a deadline are placed at the bottom
 */

import type { Node, Edge } from "@xyflow/react";
import type { Task, TaskGroup } from "@/types";
import { resolveDeadline } from "@/lib/dates";

/** Data payload attached to each React Flow node */
export interface TaskNodeData extends Record<string, unknown> {
  task: Task;
  groupColor: string;
  resolvedDate: Date | null;
  hasUnresolvedIssues: boolean;
  hasUnansweredQuestions: boolean;
  assigneeName: string;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;
const GROUP_GAP = 220;
const Y_PIXELS_PER_DAY = 60;

/**
 * Build React Flow nodes and edges from tasks, groups, and the anchor date.
 */
export function computeLayout(
  tasks: Task[],
  groups: TaskGroup[],
  anchorDate: string,
  helpers: Record<string, { name: string }>,
): { nodes: Node<TaskNodeData>[]; edges: Edge[] } {
  // Assign each group an x-column index
  const groupPaths = [...new Set(tasks.map((t) => t.group))];
  // Use the order from the groups list, falling back to alphabetical
  const sortedGroupPaths = groupPaths.sort((a, b) => {
    const ai = groups.findIndex((g) => g.path === a);
    const bi = groups.findIndex((g) => g.path === b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  const groupXIndex = new Map(sortedGroupPaths.map((p, i) => [p, i]));
  const groupColorMap = new Map(groups.map((g) => [g.path, g.meta.color]));

  // Resolve all deadlines to get the date range
  const resolved = tasks.map((t) => ({
    task: t,
    date: resolveDeadline(t.deadline, anchorDate),
  }));

  const dates = resolved
    .map((r) => r.date)
    .filter((d): d is Date => d !== null);

  const minTime = dates.length > 0 ? Math.min(...dates.map((d) => d.getTime())) : Date.now();

  // Build nodes
  const nodes: Node<TaskNodeData>[] = resolved.map(({ task, date }) => {
    const col = groupXIndex.get(task.group) ?? 0;
    const y = date
      ? ((date.getTime() - minTime) / (1000 * 60 * 60 * 24)) * Y_PIXELS_PER_DAY
      : (dates.length > 0
          ? ((Math.max(...dates.map((d) => d.getTime())) - minTime) / (1000 * 60 * 60 * 24) + 5) * Y_PIXELS_PER_DAY
          : 200);

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
      id: task.id,
      type: "taskNode",
      position: { x: col * GROUP_GAP + 40, y },
      data: {
        task,
        groupColor: groupColorMap.get(task.group) ?? "#9CA3AF",
        resolvedDate: date,
        hasUnresolvedIssues,
        hasUnansweredQuestions,
        assigneeName,
      },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
  });

  // Build edges from dependency relationships
  const edges: Edge[] = [];
  for (const task of tasks) {
    for (const depId of task.depends_on) {
      edges.push({
        id: `${depId}->${task.id}`,
        source: depId,
        target: task.id,
        style: { strokeDasharray: "6 3", stroke: "#6B7280" },
        animated: false,
      });
    }
  }

  return { nodes, edges };
}
