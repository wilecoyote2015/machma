import { useProjectStore } from "@/stores/project-store";
import { ProjectPicker } from "@/components/common/ProjectPicker";
import { AppShell } from "@/components/AppShell";
import { useFileWatcher } from "@/hooks/useFileWatcher";

/**
 * Root application component.
 * Shows the project picker when no project is loaded,
 * otherwise renders the three-panel app shell.
 * The file watcher polls for external changes in the background.
 */
export function App() {
  const project = useProjectStore((s) => s.project);
  useFileWatcher();

  if (!project) {
    return <ProjectPicker />;
  }

  return <AppShell />;
}
