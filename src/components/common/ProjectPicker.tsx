/**
 * Landing screen shown when no project is loaded.
 * Single button that triggers the OS directory picker.
 */

import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";

export function ProjectPicker() {
  const openProject = useProjectStore((s) => s.openProject);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setError(null);
    setLoading(true);
    try {
      await openProject();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User cancelled the picker — ignore
      } else {
        setError(e instanceof Error ? e.message : "Failed to open project");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold text-gray-800">Machma</h1>
        <p className="mb-8 text-gray-500">Task management for events</p>

        <button
          onClick={handleOpen}
          disabled={loading}
          className="rounded-lg bg-orange-500 px-8 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Open Project Folder"}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        <p className="mt-6 text-xs text-gray-400">
          Select a directory containing project.json
        </p>
      </div>
    </div>
  );
}
