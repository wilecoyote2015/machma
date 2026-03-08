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

import { useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  type NodeMouseHandler,
  type NodeTypes,
  type Edge,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import { useProjectStore } from "@/stores/project-store";
import { computeLayout } from "./layout";
import { TaskNode } from "./TaskNode";
import { TimelineTickNode } from "./TimelineTickNode";
import { applyFilters } from "@/lib/filters";
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

  const { nodes, edges: computedEdges } = useMemo(
    () =>
      computeLayout(
        filteredTasks,
        project.groups,
        project.meta.anchor_date,
        project.helpers,
      ),
    [filteredTasks, project.groups, project.meta.anchor_date, project.helpers],
  );

  // ── Controlled edge state ──────────────────────────────────────────
  // Edges are derived from task data but managed locally for interactive
  // selection/deletion via React Flow's controlled-edge API.
  const [edges, setEdges] = useState<Edge[]>(computedEdges);

  useEffect(() => {
    setEdges(computedEdges);
  }, [computedEdges]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

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

  // ── Node selection ─────────────────────────────────────────────────
  const nodesWithSelection = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: !n.id.startsWith("__tick_") && n.id === selectedTaskId,
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

  return (
    <ViewLayout
      filterPanel={<FilterPanel />}
      detailPanel={selectedTask ? <TaskDetail task={selectedTask} /> : null}
    >
      <div className="h-full w-full">
        <ReactFlow
          nodes={nodesWithSelection}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          connectionLineStyle={connectionLineStyle}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
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
