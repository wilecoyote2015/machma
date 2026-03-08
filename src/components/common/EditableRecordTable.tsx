/**
 * Generic editable table for managing key-value records (helpers, entities).
 * Provides inline editing, add/remove, and a save button.
 */

import { useState } from "react";

interface EditableRecordTableProps<T extends { [K in keyof T]: string }> {
  title: string;
  /** Current records keyed by short ID */
  records: Record<string, T>;
  /** Ordered list of field keys to show as columns */
  fields: (keyof T & string)[];
  /** Called with the full updated records map when user saves */
  onSave: (records: Record<string, T>) => Promise<void>;
  /** Default values for a new record */
  newRecordDefaults: T;
  /** Placeholder for the new-record ID input */
  idPlaceholder: string;
}

export function EditableRecordTable<T extends { [K in keyof T]: string }>({
  title,
  records: initialRecords,
  fields,
  onSave,
  newRecordDefaults,
  idPlaceholder,
}: EditableRecordTableProps<T>) {
  const [records, setRecords] = useState(initialRecords);
  const [newId, setNewId] = useState("");
  const [dirty, setDirty] = useState(false);

  const updateField = (id: string, field: keyof T & string, value: string) => {
    setRecords((prev) => ({
      ...prev,
      [id]: { ...prev[id]!, [field]: value },
    }));
    setDirty(true);
  };

  const addRecord = () => {
    const id = newId.trim().toLowerCase().replace(/\s+/g, "_");
    if (!id || records[id]) return;
    setRecords((prev) => ({ ...prev, [id]: { ...newRecordDefaults } }));
    setNewId("");
    setDirty(true);
  };

  const removeRecord = (id: string) => {
    setRecords((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    await onSave(records);
    setDirty(false);
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        {dirty && (
          <button onClick={handleSave} className="btn-primary">
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
            {Object.entries(records).map(([id, record]) => (
              <tr key={id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-2 py-2 font-mono text-xs text-gray-600">{id}</td>
                {fields.map((field) => (
                  <td key={field} className="px-2 py-2">
                    <input
                      value={record[field]}
                      onChange={(e) => updateField(id, field, e.target.value)}
                      className="input-light w-full"
                    />
                  </td>
                ))}
                <td className="px-2 py-2">
                  <button
                    onClick={() => removeRecord(id)}
                    className="text-xs text-gray-400 hover:text-issue"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addRecord()}
          placeholder={idPlaceholder}
          className="input-light"
        />
        <button onClick={addRecord} disabled={!newId.trim()} className="btn-secondary disabled:opacity-50">
          Add
        </button>
      </div>
    </div>
  );
}
