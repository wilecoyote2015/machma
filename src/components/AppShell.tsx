/**
 * Main application shell with three-panel layout:
 * - Left: Filter panel (collapsible)
 * - Center: Timeline view (or helpers/entities management)
 * - Right: Task detail panel (collapsible, shown when a task is selected)
 *
 * Also includes a top bar with project name and navigation.
 */

import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { TimelineView } from "@/components/timeline/TimelineView";
import { TaskDetail } from "@/components/detail/TaskDetail";
import { HelpersView } from "@/components/common/HelpersView";
import { EntitiesView } from "@/components/common/EntitiesView";

export function AppShell() {
  const project = useProjectStore((s) => s.project)!;
  const selectedTaskId = useProjectStore((s) => s.selectedTaskId);
  const activeView = useProjectStore((s) => s.activeView);
  const setActiveView = useProjectStore((s) => s.setActiveView);
  const openProject = useProjectStore((s) => s.openProject);
  const [leftOpen, setLeftOpen] = useState(true);

  const selectedTask = selectedTaskId
    ? project.tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  const navItems = [
    { key: "timeline" as const, label: "Timeline" },
    { key: "helpers" as const, label: "Helpers" },
    { key: "entities" as const, label: "Entities" },
  ];

  return (
    <div className="flex h-full flex-col bg-gray-100">
      {/* ── Top bar ──────────────────────────────────────── */}
      <header className="flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className="text-gray-500 hover:text-gray-700"
            title="Toggle filter panel"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">{project.meta.name}</h1>
          <span className="text-sm text-gray-400">Anchor: {project.meta.anchor_date}</span>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                activeView === item.key
                  ? "bg-orange-100 text-orange-700"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="mx-2 h-5 w-px bg-gray-200" />
          <button
            onClick={openProject}
            className="text-sm text-gray-400 hover:text-gray-600"
            title="Open another project"
          >
            Open...
          </button>
        </nav>
      </header>

      {/* ── Content area ─────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel */}
        {leftOpen && activeView === "timeline" && (
          <aside className="w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-orange-500 p-4">
            <FilterPanel />
          </aside>
        )}

        {/* Center */}
        <main className="min-w-0 flex-1">
          {activeView === "timeline" && <TimelineView />}
          {activeView === "helpers" && <HelpersView />}
          {activeView === "entities" && <EntitiesView />}
        </main>

        {/* Right panel — task detail */}
        {selectedTask && activeView === "timeline" && (
          <aside className="w-96 shrink-0 overflow-y-auto border-l border-gray-200 bg-orange-500 p-4">
            <TaskDetail task={selectedTask} />
          </aside>
        )}
      </div>
    </div>
  );
}
