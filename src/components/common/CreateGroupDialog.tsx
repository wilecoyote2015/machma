/**
 * Modal dialog for creating a new task group.
 * Allows entering a group name, selecting an optional parent group
 * (for nested groups), and picking a display color.
 */

import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { DEFAULT_GROUP_COLOR } from "@/lib/constants";

/** Predefined palette for quick color selection */
const COLOR_PRESETS = [
  "#EF4444", "#F97316", "#F59E0B", "#22C55E", "#14B8A6",
  "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#9CA3AF",
];

interface CreateGroupDialogProps {
  onClose: () => void;
  /** Called with the newly created group path after successful creation */
  onCreated: (groupPath: string) => void;
}

export function CreateGroupDialog({ onClose, onCreated }: CreateGroupDialogProps) {
  const project = useProjectStore((s) => s.project)!;
  const createGroup = useProjectStore((s) => s.createGroup);

  const [name, setName] = useState("");
  const [parentGroup, setParentGroup] = useState("");
  const [color, setColor] = useState(DEFAULT_GROUP_COLOR);
  const [error, setError] = useState("");

  const sanitizedName = name.trim().toLowerCase().replace(/\s+/g, "_");
  const newPath = parentGroup ? `${parentGroup}/${sanitizedName}` : sanitizedName;

  const handleCreate = async () => {
    if (!sanitizedName) { setError("Group name is required"); return; }
    if (project.groups.some((g) => g.path === newPath)) {
      setError("A group with this path already exists");
      return;
    }

    await createGroup(newPath, { color, description: "" });
    onCreated(newPath);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-80 rounded-lg bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-lg font-semibold text-gray-800">New Group</h3>

        <div className="space-y-3">
          {/* Group name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">Name</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. horses"
              className="input-light w-full"
              autoFocus
            />
          </div>

          {/* Parent group selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">Parent Group</label>
            <select
              value={parentGroup}
              onChange={(e) => setParentGroup(e.target.value)}
              className="input-light w-full"
            >
              <option value="">— none (root level) —</option>
              {project.groups.map((g) => (
                <option key={g.path} value={g.path}>{g.path}</option>
              ))}
            </select>
          </div>

          {/* Color picker */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    color === c ? "border-gray-800 scale-110" : "border-transparent hover:border-gray-300"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              {/* Custom color input */}
              <label className="relative h-7 w-7 cursor-pointer" title="Custom color">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-xs text-gray-400">
                  +
                </span>
              </label>
            </div>
          </div>

          {/* Preview */}
          {sanitizedName && (
            <div className="rounded bg-gray-50 px-2 py-1.5 text-sm text-gray-600">
              <span className="font-medium">Preview: </span>
              <GroupBadge groupPath={newPath} color={color} />
            </div>
          )}

          {error && <p className="text-xs text-issue">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} className="btn-primary">Create</button>
        </div>
      </div>
    </div>
  );
}
