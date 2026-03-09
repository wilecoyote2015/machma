/**
 * Landing screen shown when no project is loaded.
 *
 * Displays a "Open Project Folder" button and, below it, the 5 most recently
 * opened projects for one-click quick access.  The recent-projects list is
 * loaded from the Electron main process (persisted at
 * `<userData>/recent-projects.json`) on mount.
 */

import { useEffect, useState } from "react";
import { useProjectStore } from "@/stores/project-store";

export function ProjectPicker() {
  const openProject = useProjectStore((s) => s.openProject);
  const openProjectFromPath = useProjectStore((s) => s.openProjectFromPath);

  const [error, setError] = useState<string | null>(null);
  /** Which action is currently loading: "browse" | recent project path | null */
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  // Load the recent-projects list once on mount.
  useEffect(() => {
    window.electronAPI
      .getRecentProjects()
      .then(setRecentProjects)
      .catch(() => {
        /* silently ignore — missing history is not an error */
      });
  }, []);

  /** Open a fresh project via the OS directory dialog. */
  const handleBrowse = async () => {
    setError(null);
    setLoadingKey("browse");
    try {
      await openProject();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User cancelled — not an error.
      } else {
        setError(e instanceof Error ? e.message : "Failed to open project");
      }
    } finally {
      setLoadingKey(null);
    }
  };

  /** Open a project directly from a known path (recent list click). */
  const handleOpenRecent = async (projectPath: string) => {
    setError(null);
    setLoadingKey(projectPath);
    try {
      await openProjectFromPath(projectPath);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not open "${projectPath}": ${e.message}`
          : "Failed to open recent project",
      );
    } finally {
      setLoadingKey(null);
    }
  };

  const isBusy = loadingKey !== null;

  return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-4 text-center">
        {/* ── Header ── */}
        <h1 className="mb-2 text-4xl font-bold text-gray-800">Machma</h1>
        <p className="mb-8 text-gray-500">Task management for events</p>

        {/* ── Browse button ── */}
        <button
          onClick={handleBrowse}
          disabled={isBusy}
          className="btn-primary w-full px-8 py-3 text-lg disabled:opacity-50"
        >
          {loadingKey === "browse" ? "Loading…" : "Open Project Folder"}
        </button>

        {error && <p className="mt-4 text-sm text-issue">{error}</p>}

        <p className="mt-3 text-xs text-gray-400">
          Select a directory containing project.json
        </p>

        {/* ── Recent projects ── */}
        {recentProjects.length > 0 && (
          <div className="mt-8 text-left">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Recent Projects
            </h2>

            <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              {recentProjects.map((rp) => (
                <li key={rp.path}>
                  <button
                    onClick={() => handleOpenRecent(rp.path)}
                    disabled={isBusy}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {/* Folder icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 shrink-0 text-gray-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M2 6a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-800">
                        {loadingKey === rp.path ? "Loading…" : rp.name}
                      </span>
                      <span className="block truncate text-xs text-gray-400" title={rp.path}>
                        {rp.path}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
