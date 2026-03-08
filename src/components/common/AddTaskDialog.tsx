/**
 * Simple inline dialog for creating a new task.
 * User picks a group and enters a task ID (filename).
 */

import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";

interface AddTaskDialogProps {
  onClose: () => void;
}

export function AddTaskDialog({ onClose }: AddTaskDialogProps) {
  const project = useProjectStore((s) => s.project)!;
  const addTask = useProjectStore((s) => s.addTask);

  const [group, setGroup] = useState(project.groups[0]?.path ?? "");
  const [taskId, setTaskId] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    const id = taskId.trim().toLowerCase().replace(/\s+/g, "_").replace(/\.md$/, "");
    if (!id) {
      setError("Task ID is required");
      return;
    }
    if (project.tasks.some((t) => t.id === id)) {
      setError("A task with this ID already exists");
      return;
    }
    if (!group) {
      setError("Please select a group");
      return;
    }
    await addTask(group, id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-80 rounded-lg bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-lg font-semibold text-gray-800">New Task</h3>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">Group</label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
            >
              {project.groups.map((g) => (
                <option key={g.path} value={g.path}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Task ID (filename)
            </label>
            <input
              value={taskId}
              onChange={(e) => { setTaskId(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. setup_stage"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
              autoFocus
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="rounded bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
