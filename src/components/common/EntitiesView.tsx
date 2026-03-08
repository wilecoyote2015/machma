/**
 * Management view for external entities (contacts, organisations).
 * Thin wrapper around EditableRecordTable.
 */

import type { ExternalEntity } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { EditableRecordTable } from "@/components/common/EditableRecordTable";

const FIELDS: (keyof ExternalEntity)[] = ["name", "description", "type", "email", "phone", "address"];
const DEFAULTS: ExternalEntity = { name: "", description: "", type: "person", email: "", phone: "", address: "" };

export function EntitiesView() {
  const project = useProjectStore((s) => s.project)!;
  const saveEntities = useProjectStore((s) => s.saveExternalEntities);

  const handleSave = async (records: Record<string, ExternalEntity>) => {
    const store = useProjectStore.getState();
    if (store.project) {
      store.project.external_entities = records;
      await saveEntities();
    }
  };

  return (
    <EditableRecordTable
      title="External Entities"
      records={project.external_entities}
      fields={FIELDS}
      onSave={handleSave}
      newRecordDefaults={DEFAULTS}
      idPlaceholder="New entity ID (e.g. horse_manager)"
    />
  );
}
