/**
 * Management view for external entities (contacts, organisations).
 * Displays a table with inline editing, plus add/remove functionality.
 */

import { useState } from "react";
import type { ExternalEntity } from "@/types";
import { useProjectStore } from "@/stores/project-store";

export function EntitiesView() {
  const project = useProjectStore((s) => s.project)!;
  const saveEntities = useProjectStore((s) => s.saveExternalEntities);
  const [entities, setEntities] = useState(project.external_entities);
  const [newId, setNewId] = useState("");
  const [dirty, setDirty] = useState(false);

  const updateEntity = (id: string, field: keyof ExternalEntity, value: string) => {
    setEntities((prev) => ({
      ...prev,
      [id]: { ...prev[id]!, [field]: value },
    }));
    setDirty(true);
  };

  const addEntity = () => {
    const id = newId.trim().toLowerCase().replace(/\s+/g, "_");
    if (!id || entities[id]) return;
    setEntities((prev) => ({
      ...prev,
      [id]: { name: "", description: "", type: "person", email: "", phone: "", address: "" },
    }));
    setNewId("");
    setDirty(true);
  };

  const removeEntity = (id: string) => {
    setEntities((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    const store = useProjectStore.getState();
    if (store.project) {
      store.project.external_entities = entities;
      await saveEntities();
      setDirty(false);
    }
  };

  const fields: (keyof ExternalEntity)[] = [
    "name",
    "description",
    "type",
    "email",
    "phone",
    "address",
  ];

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">External Entities</h2>
        {dirty && (
          <button
            onClick={handleSave}
            className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Save Changes
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
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
            {Object.entries(entities).map(([id, entity]) => (
              <tr key={id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-2 py-2 font-mono text-xs text-gray-600">{id}</td>
                {fields.map((field) => (
                  <td key={field} className="px-2 py-2">
                    <input
                      value={entity[field]}
                      onChange={(e) => updateEntity(id, field, e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-orange-400 focus:outline-none"
                    />
                  </td>
                ))}
                <td className="px-2 py-2">
                  <button
                    onClick={() => removeEntity(id)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new entity */}
      <div className="mt-4 flex items-center gap-2">
        <input
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addEntity()}
          placeholder="New entity ID (e.g. horse_manager)"
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
        />
        <button
          onClick={addEntity}
          disabled={!newId.trim()}
          className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Add Entity
        </button>
      </div>
    </div>
  );
}
