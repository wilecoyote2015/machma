/**
 * Thin application shell: top navigation bar + active view.
 * Each view manages its own panels via ViewLayout.
 */

import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { TimelineView } from "@/components/timeline/TimelineView";
import { TaskTableView } from "@/components/table/TaskTableView";
import { HelpersView } from "@/components/common/HelpersView";
import { EntitiesView } from "@/components/common/EntitiesView";
import { AddTaskDialog } from "@/components/common/AddTaskDialog";

type ActiveView = "timeline" | "table" | "helpers" | "entities";

const NAV_ITEMS: { key: ActiveView; label: string }[] = [
  { key: "timeline", label: "Timeline" },
  { key: "table", label: "Table" },
  { key: "helpers", label: "Helpers" },
  { key: "entities", label: "Entities" },
];

export function AppShell() {
  const project = useProjectStore((s) => s.project)!;
  const activeView = useProjectStore((s) => s.activeView);
  const setActiveView = useProjectStore((s) => s.setActiveView);
  const openProject = useProjectStore((s) => s.openProject);
  const [showAddTask, setShowAddTask] = useState(false);

  return (
    <div className="flex h-full flex-col bg-gray-100">
      {/* ── Top bar ──────────────────────────────────────── */}
      <header className="flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-800">{project.meta.name}</h1>
          <span className="hidden text-sm text-gray-400 sm:inline">
            Anchor: {project.meta.anchor_date}
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                activeView === item.key
                  ? "bg-primary-subtle text-primary-hover"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="mx-2 h-5 w-px bg-gray-200" />
          <button onClick={() => setShowAddTask(true)} className="btn-primary">
            + New Task
          </button>
          <button
            onClick={openProject}
            className="ml-1 text-sm text-gray-400 hover:text-gray-600"
            title="Open another project"
          >
            Open...
          </button>
        </nav>
      </header>

      {/* ── Active view (each view provides its own ViewLayout) ── */}
      <div className="flex min-h-0 flex-1">
        {activeView === "timeline" && <TimelineView />}
        {activeView === "table" && <TaskTableView />}
        {activeView === "helpers" && <HelpersView />}
        {activeView === "entities" && <EntitiesView />}
      </div>

      {showAddTask && <AddTaskDialog onClose={() => setShowAddTask(false)} />}
    </div>
  );
}
