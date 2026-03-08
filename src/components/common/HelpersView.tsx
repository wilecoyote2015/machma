/**
 * Management view for helpers (internal people).
 * Thin wrapper around EditableRecordTable.
 */

import type { Helper } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { EditableRecordTable } from "@/components/common/EditableRecordTable";

const FIELDS: (keyof Helper)[] = ["name", "email", "phone", "address"];
const DEFAULTS: Helper = { name: "", email: "", phone: "", address: "" };

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
      onSave={handleSave}
      newRecordDefaults={DEFAULTS}
      idPlaceholder="New helper ID (e.g. bs)"
    />
  );
}
