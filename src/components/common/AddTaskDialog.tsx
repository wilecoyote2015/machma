/**
 * Modal dialog for creating a new task.
 * Includes a group selector with a "New group…" option
 * that opens the CreateGroupDialog inline.
 */

import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { CreateGroupDialog } from "@/components/common/CreateGroupDialog";

/** Sentinel value used as the "New group…" option */
const NEW_GROUP_SENTINEL = "__new_group__";

interface AddTaskDialogProps {
  onClose: () => void;
}

export function AddTaskDialog({ onClose }: AddTaskDialogProps) {
  const project = useProjectStore((s) => s.project)!;
  const addTask = useProjectStore((s) => s.addTask);

  const [group, setGroup] = useState(project.groups[0]?.path ?? "");
  const [taskId, setTaskId] = useState("");
  const [error, setError] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const handleCreate = async () => {
    const id = taskId.trim().toLowerCase().replace(/\s+/g, "_").replace(/\.md$/, "");
    if (!id) { setError("Task ID is required"); return; }
    if (project.tasks.some((t) => t.id === id)) { setError("A task with this ID already exists"); return; }
    if (!group) { setError("Please select a group"); return; }
    await addTask(group, id);
    onClose();
  };

  const handleGroupChange = (value: string) => {
    if (value === NEW_GROUP_SENTINEL) {
      setShowCreateGroup(true);
      return;
    }
    setGroup(value);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="w-80 rounded-lg bg-white p-5 shadow-xl">
          <h3 className="mb-3 text-lg font-semibold text-gray-800">New Task</h3>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">Group</label>
              <select
                value={group}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="input-light w-full"
              >
                <option value={NEW_GROUP_SENTINEL}>+ New group…</option>
                {project.groups.map((g) => (
                  <option key={g.path} value={g.path}>{g.path}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">Task ID (filename)</label>
              <input
                value={taskId}
                onChange={(e) => { setTaskId(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="e.g. setup_stage"
                className="input-light w-full"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-issue">{error}</p>}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} className="btn-primary">Create</button>
          </div>
        </div>
      </div>

      {showCreateGroup && (
        <CreateGroupDialog
          onClose={() => setShowCreateGroup(false)}
          onCreated={(groupPath) => setGroup(groupPath)}
        />
      )}
    </>
  );
}
