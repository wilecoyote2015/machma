/**
 * Timeline view: React Flow canvas wrapped in ViewLayout
 * with a filter panel on the left and task detail on the right.
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
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";
import { ViewLayout } from "@/components/common/ViewLayout";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { TaskDetail } from "@/components/detail/TaskDetail";

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
