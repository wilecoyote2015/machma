/**
 * The main timeline view showing tasks as nodes on a React Flow canvas.
 * Handles filtering, layout computation, and task selection.
 */

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";
import { useProjectStore } from "@/stores/project-store";
import { computeLayout } from "./layout";
import { TaskNode } from "./TaskNode";
import { TimelineTickNode } from "./TimelineTickNode";
import { applyFilters } from "@/lib/filters";

const nodeTypes: NodeTypes = {
  taskNode: TaskNode,
  timelineTick: TimelineTickNode,
};

export function TimelineView() {
  const project = useProjectStore((s) => s.project)!;
  const filters = useProjectStore((s) => s.filters);
  const selectedTaskId = useProjectStore((s) => s.selectedTaskId);
  const selectTask = useProjectStore((s) => s.selectTask);

  const filteredTasks = useMemo(
    () => applyFilters(project.tasks, filters, project.meta.anchor_date),
    [project.tasks, filters, project.meta.anchor_date],
  );

  // Compute layout from filtered tasks
  const { nodes, edges } = useMemo(
    () =>
      computeLayout(
        filteredTasks,
        project.groups,
        project.meta.anchor_date,
        project.helpers,
      ),
    [filteredTasks, project.groups, project.meta.anchor_date, project.helpers],
  );

  // Highlight selected task node (tick nodes stay unselected)
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
      // Ignore clicks on timeline tick nodes
      if (node.id.startsWith("__tick_")) return;
      selectTask(node.id === selectedTaskId ? null : node.id);
    },
    [selectTask, selectedTaskId],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
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
            return data?.groupColor ?? "#9CA3AF";
          }}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
