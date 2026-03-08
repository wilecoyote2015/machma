/**
 * Timeline view: React Flow canvas wrapped in ViewLayout
 * with a filter panel on the left and task detail on the right.
 *
 * Supports interactive dependency management:
 * - Drag from a node's bottom handle (source) to another node's top handle
 *   (target) to create a dependency (target depends on source).
 * - Select a dependency edge and press Delete/Backspace to remove it.
 * - Dependency edges are colored by the source task's status.
 */

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
  type ReactFlowInstance,
  type NodeMouseHandler,
  type NodeTypes,
  type Node,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type Connection,
} from "@xyflow/react";
import { useProjectStore } from "@/stores/project-store";
import { computeLayout } from "./layout";
import { TaskNode } from "./TaskNode";
import { TimelineTickNode } from "./TimelineTickNode";
import { applyFilters } from "@/lib/filters";
import {
  resolveDeadline,
  resolveStartDate,
  formatDate,
  formatTime,
  snapToDay,
  snapTo15Min,
} from "@/lib/dates";
import { DEFAULT_GROUP_COLOR, EDGE_COLOR } from "@/lib/constants";
import { ViewLayout } from "@/components/common/ViewLayout";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { TaskDetail } from "@/components/detail/TaskDetail";

const nodeTypes: NodeTypes = {
  taskNode: TaskNode,
  timelineTick: TimelineTickNode,
};

/** Style applied to the temporary line while the user drags a connection. */
const connectionLineStyle = { stroke: EDGE_COLOR.todo, strokeWidth: 2, strokeDasharray: "6 3" };

export function TimelineView() {
  const project = useProjectStore((s) => s.project)!;
  const filters = useProjectStore((s) => s.filters);
  const selectedTaskId = useProjectStore((s) => s.selectedTaskId);
  const selectTask = useProjectStore((s) => s.selectTask);
  const updateTask = useProjectStore((s) => s.updateTask);

  const filteredTasks = useMemo(
    () => applyFilters(project.tasks, filters, project.meta.anchor_date),
    [project.tasks, filters, project.meta.anchor_date],
  );

  /** Deadline range from the filter state, used to trigger day-view mode in layout. */
  const deadlineRange = useMemo(
    () => ({ start: filters.deadlineStart, end: filters.deadlineEnd }),
    [filters.deadlineStart, filters.deadlineEnd],
  );

  const { nodes: layoutNodes, edges: computedEdges, yToTime, isDayView } = useMemo(
    () =>
      computeLayout(
        filteredTasks,
        project.tasks,
        project.groups,
        project.meta.anchor_date,
        project.helpers,
        deadlineRange,
      ),
    [filteredTasks, project.tasks, project.groups, project.meta.anchor_date, project.helpers, deadlineRange],
  );

  // ── Controlled edge state ──────────────────────────────────────────
  // Edges are derived from task data but managed locally for interactive
  // selection/deletion via React Flow's controlled-edge API.
  // Synced synchronously (during render) to avoid 1-frame mismatches.
  const [edges, setEdges] = useState<Edge[]>(computedEdges);
  const [prevComputedEdges, setPrevComputedEdges] = useState(computedEdges);

  if (computedEdges !== prevComputedEdges) {
    setEdges(computedEdges);
    setPrevComputedEdges(computedEdges);
  }

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // ── Controlled node state for vertical-only dragging ──────────────
  // Internal node state mirrors layout nodes but allows Y-axis dragging.
  // Synced from layout on recompute; drag changes constrain X to layout position.
  const [nodes, setNodes] = useState<Node[]>(layoutNodes);
  const [prevLayoutNodes, setPrevLayoutNodes] = useState(layoutNodes);

  if (layoutNodes !== prevLayoutNodes) {
    setNodes(layoutNodes);
    setPrevLayoutNodes(layoutNodes);
  }

  /** Tracks the layout-computed X position per node for Y-only drag constraint. */
  const layoutXRef = useRef<Map<string, number>>(new Map());
  if (layoutNodes !== prevLayoutNodes || layoutXRef.current.size === 0) {
    const xMap = new Map<string, number>();
    for (const n of layoutNodes) xMap.set(n.id, n.position.x);
    layoutXRef.current = xMap;
  }

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const xMap = layoutXRef.current;
    const constrained = changes.map((change) => {
      // Lock X coordinate during drag so nodes only move vertically
      if (change.type === "position" && change.position && !change.id.startsWith("__tick_")) {
        const layoutX = xMap.get(change.id);
        if (layoutX !== undefined) {
          return { ...change, position: { ...change.position, x: layoutX } };
        }
      }
      return change;
    });
    setNodes((nds) => applyNodeChanges(constrained, nds));
  }, []);

  // ── Selection emphasis ─────────────────────────────────────────────
  // Edges touching the selected node become thicker and solid (not dashed)
  // so the user immediately sees the selected task's dependency context.
  const displayEdges = useMemo(() => {
    if (!selectedTaskId) return edges;
    return edges.map((edge) => {
      if (!edge.id.includes("->")) return edge;
      const connected =
        edge.source === selectedTaskId || edge.target === selectedTaskId;
      if (!connected) return edge;
      return {
        ...edge,
        style: {
          ...edge.style,
          strokeWidth: 4,
          strokeDasharray: undefined,
        },
        zIndex: 1,
      };
    });
  }, [edges, selectedTaskId]);

  // ── Connection creation ────────────────────────────────────────────
  // Dragging from source (bottom handle) → target (top handle) means
  // "target task depends on source task".
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const targetTask = project.tasks.find((t) => t.id === connection.target);
      if (!targetTask) return;
      if (targetTask.depends_on.includes(connection.source)) return;

      updateTask({
        ...targetTask,
        depends_on: [...targetTask.depends_on, connection.source],
      });
    },
    [project.tasks, updateTask],
  );

  // ── Connection validation ──────────────────────────────────────────
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;
      if (
        connection.source.startsWith("__tick_") ||
        connection.target.startsWith("__tick_")
      )
        return false;

      const targetTask = project.tasks.find((t) => t.id === connection.target);
      if (!targetTask) return false;
      if (targetTask.depends_on.includes(connection.source)) return false;
      return true;
    },
    [project.tasks],
  );

  // ── Edge deletion ──────────────────────────────────────────────────
  // When the user selects a dependency edge and presses Delete/Backspace,
  // remove the corresponding entry from the target task's depends_on.
  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const edge of deleted) {
        if (!edge.id.includes("->")) continue;
        const [depId, taskId] = edge.id.split("->");
        const task = project.tasks.find((t) => t.id === taskId);
        if (task && depId) {
          updateTask({
            ...task,
            depends_on: task.depends_on.filter((d) => d !== depId),
          });
        }
      }
    },
    [project.tasks, updateTask],
  );

  // ── Node drag-to-set-date ─────────────────────────────────────────
  // When a task node is dropped at a new Y position, compute the
  // corresponding date (snapping to days or 15-min depending on mode)
  // and update the task's start/deadline accordingly.
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith("__tick_")) return;

      const task = project.tasks.find((t) => t.id === node.id);
      if (!task) return;

      const anchor = project.meta.anchor_date;
      const hasStart = task.start_date.trim() !== "" || task.start_time.trim() !== "";

      // Resolve current positions to compute duration
      const currentStart = resolveStartDate(
        task.start_date, task.start_time, task.deadline, anchor,
        isDayView ? task.start_time : undefined,
      );
      const currentDeadline = resolveDeadline(
        task.deadline, anchor, isDayView ? task.time : undefined,
      );

      let durationMs = 0;
      if (hasStart && currentStart && currentDeadline) {
        durationMs = currentDeadline.getTime() - currentStart.getTime();
      }

      // Convert drop Y → timestamp → snapped date
      const rawTime = yToTime(node.position.y);
      const snapped = isDayView ? snapTo15Min(rawTime) : snapToDay(rawTime);

      const updated = { ...task };

      if (hasStart) {
        // Task has a start date/time: move start, deadline follows to preserve duration
        updated.start_date = formatDate(snapped);
        const newDeadline = new Date(snapped.getTime() + durationMs);
        updated.deadline = formatDate(newDeadline);
        if (isDayView) {
          updated.start_time = formatTime(snapped);
          updated.time = formatTime(newDeadline);
        }
      } else {
        // No start date: just move the deadline
        updated.deadline = formatDate(snapped);
        if (isDayView) {
          updated.time = formatTime(snapped);
        }
      }

      updateTask(updated);
    },
    [project.tasks, project.meta.anchor_date, isDayView, yToTime, updateTask],
  );

  // ── Node selection ─────────────────────────────────────────────────
  const nodesWithSelection = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: !n.id.startsWith("__tick_") && n.id === selectedTaskId,
        // Tick nodes are never draggable; task nodes support vertical drag
        draggable: !n.id.startsWith("__tick_"),
      })),
    [nodes, selectedTaskId],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.id.startsWith("__tick_")) return;
      selectTask(node.id === selectedTaskId ? null : node.id);
    },
    [selectTask, selectedTaskId],
  );

  const selectedTask = selectedTaskId
    ? project.tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  /** Only task nodes (not timeline ticks) should be considered for fit-to-view */
  const fitViewNodes = useMemo(
    () => filteredTasks.map((t) => ({ id: t.id })),
    [filteredTasks],
  );

  // ── React Flow instance for programmatic control ──────────────────
  // Only the `fitView` method is needed; use a minimal pick to avoid
  // generic variance issues with the inferred node type.
  const rfInstanceRef = useRef<Pick<ReactFlowInstance, "fitView"> | null>(null);

  const onInit = useCallback((instance: Pick<ReactFlowInstance, "fitView">) => {
    rfInstanceRef.current = instance;
  }, []);

  // ── Ctrl+F shortcut: fit view ─────────────────────────────────────
  // Listens on window so it fires regardless of which panel is hovered.
  // Only active while TimelineView is mounted.
  const fitViewOptionsRef = useRef({ padding: 0.3, nodes: fitViewNodes });
  fitViewOptionsRef.current = { padding: 0.3, nodes: fitViewNodes };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        rfInstanceRef.current?.fitView(fitViewOptionsRef.current);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ViewLayout
      filterPanel={<FilterPanel />}
      detailPanel={selectedTask ? <TaskDetail task={selectedTask} /> : null}
    >
      <div className="h-full w-full">
        <ReactFlow
          nodes={nodesWithSelection}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          onInit={onInit}
          isValidConnection={isValidConnection}
          connectionLineStyle={connectionLineStyle}
          fitView
          fitViewOptions={{ padding: 0.3, nodes: fitViewNodes }}
          minZoom={0.05}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background/>
          <Controls fitViewOptions={{ padding: 0.3, nodes: fitViewNodes }} />
          <MiniMap
            nodeColor={(node) => {
              if (node.id.startsWith("__tick_")) return "transparent";
              const data = node.data as { groupColor?: string } | undefined;
              return data?.groupColor ?? DEFAULT_GROUP_COLOR;
            }}
            zoomable
            pannable
          />
        </ReactFlow>
      </div>
    </ViewLayout>
  );
}
