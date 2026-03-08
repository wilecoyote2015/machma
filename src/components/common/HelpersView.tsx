/**
 * Management view for helpers (internal people).
 * Thin wrapper around EditableRecordTable.
 */

import type { Helper } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { EditableRecordTable } from "@/components/common/EditableRecordTable";
import { DEFAULT_ASSIGNEE_COLOR } from "@/lib/constants";

const FIELDS: (keyof Helper)[] = ["name", "email", "phone", "address", "color"];
const FIELD_TYPES: Partial<Record<keyof Helper, string>> = { color: "color" };
const DEFAULTS: Helper = { name: "", email: "", phone: "", address: "", color: DEFAULT_ASSIGNEE_COLOR };

export function HelpersView() {
  const project = useProjectStore((s) => s.project)!;
  const saveHelpers = useProjectStore((s) => s.saveHelpers);

  const handleSave = async (records: Record<string, Helper>) => {
    const store = useProjectStore.getState();
    if (store.project) {
      store.project.helpers = records;
      await saveHelpers();
    }
  };

  return (
    <EditableRecordTable
      title="Helpers"
      records={project.helpers}
      fields={FIELDS}
      fieldTypes={FIELD_TYPES}
      onSave={handleSave}
      newRecordDefaults={DEFAULTS}
      idPlaceholder="New helper ID (e.g. bs)"
    />
  );
}
