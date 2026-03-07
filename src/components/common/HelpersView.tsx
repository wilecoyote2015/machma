/**
 * Management view for helpers (internal people).
 * Displays a table of all helpers with inline editing,
 * plus add/remove functionality.
 */

import { useState } from "react";
import type { Helper } from "@/types";
import { useProjectStore } from "@/stores/project-store";

export function HelpersView() {
  const project = useProjectStore((s) => s.project)!;
  const saveHelpers = useProjectStore((s) => s.saveHelpers);
  const [helpers, setHelpers] = useState(project.helpers);
  const [newId, setNewId] = useState("");
  const [dirty, setDirty] = useState(false);

  const updateHelper = (id: string, field: keyof Helper, value: string) => {
    setHelpers((prev) => ({
      ...prev,
      [id]: { ...prev[id]!, [field]: value },
    }));
    setDirty(true);
  };

  const addHelper = () => {
    const id = newId.trim().toLowerCase();
    if (!id || helpers[id]) return;
    setHelpers((prev) => ({
      ...prev,
      [id]: { name: "", email: "", phone: "", address: "" },
    }));
    setNewId("");
    setDirty(true);
  };

  const removeHelper = (id: string) => {
    setHelpers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    // Update the store's project with modified helpers, then persist
    const store = useProjectStore.getState();
    if (store.project) {
      store.project.helpers = helpers;
      await saveHelpers();
      setDirty(false);
    }
  };

  const fields: (keyof Helper)[] = ["name", "email", "phone", "address"];

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Helpers</h2>
        {dirty && (
          <button
            onClick={handleSave}
            className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Save Changes
          </button>
        )}
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="px-2 py-2 font-medium">ID</th>
            {fields.map((f) => (
              <th key={f} className="px-2 py-2 font-medium capitalize">{f}</th>
            ))}
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {Object.entries(helpers).map(([id, helper]) => (
            <tr key={id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-2 py-2 font-mono text-xs text-gray-600">{id}</td>
              {fields.map((field) => (
                <td key={field} className="px-2 py-2">
                  <input
                    value={helper[field]}
                    onChange={(e) => updateHelper(id, field, e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-orange-400 focus:outline-none"
                  />
                </td>
              ))}
              <td className="px-2 py-2">
                <button
                  onClick={() => removeHelper(id)}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add new helper */}
      <div className="mt-4 flex items-center gap-2">
        <input
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addHelper()}
          placeholder="New helper ID (e.g. bs)"
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
        />
        <button
          onClick={addHelper}
          disabled={!newId.trim()}
          className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Add Helper
        </button>
      </div>
    </div>
  );
}
