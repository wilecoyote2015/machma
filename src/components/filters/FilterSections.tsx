/**
 * Shared filter panel building blocks used by all filter panels.
 *
 * - FilterPanelShell:        outer wrapper with "Clear all" button and consistent styling
 * - DeadlineFilterSection:   deadline proximity quick-select toggle group
 * - GroupFilterSection:      group checkbox list with GroupBadge
 * - AssigneeFilterSection:   helper checkbox list with AssigneeBadge (parameterized title)
 * - toggleSet:               immutable Set toggle utility
 */

import type { ReactNode } from "react";
import { useProjectStore } from "@/stores/project-store";
import { PanelSection } from "@/components/common/PanelSection";
import { FilterToggleGroup } from "@/components/ui/FilterToggleGroup";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";

// ── Utility ─────────────────────────────────────────────────────────

/** Toggle a value in a Set immutably, returning a new Set. */
export function toggleSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

// ── Filter Panel Shell ──────────────────────────────────────────────

interface FilterPanelShellProps {
  /** Whether any filter is currently active (controls "Clear all" visibility) */
  hasActiveFilters: boolean;
  /** Called when the user clicks "Clear all" */
  onClearAll: () => void;
  children: ReactNode;
}

/**
 * Standard wrapper for all filter panels.
 * Provides consistent spacing, text color, and a conditional "Clear all" button.
 */
export function FilterPanelShell({
  hasActiveFilters,
  onClearAll,
  children,
}: FilterPanelShellProps) {
  return (
		<div className="space-y-1 text-white ">
			<div className="h-4  pb-1">
				{hasActiveFilters && (
					<div className="flex justify-end">
						<button
							onClick={onClearAll}
							className="text-xs text-white/70 underline hover:text-white">
							Clear all
						</button>
					</div>
				)}
			</div>
			{children}
		</div>
  );
}

// ── Deadline Filter Section ─────────────────────────────────────────

const DEADLINE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "All", value: null },
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

interface DeadlineFilterSectionProps {
  /** Currently selected proximity value, or null for "all" */
  value: number | null;
  onChange: (days: number | null) => void;
  /** Section title (defaults to "Deadline") */
  title?: string;
}

/** PanelSection with deadline proximity quick-select buttons. */
export function DeadlineFilterSection({
  value,
  onChange,
  title = "Deadline",
}: DeadlineFilterSectionProps) {
  return (
    <PanelSection title={title}>
      <FilterToggleGroup
        options={DEADLINE_OPTIONS}
        selected={value}
        onToggle={onChange}
      />
    </PanelSection>
  );
}

// ── Group Filter Section ────────────────────────────────────────────

interface GroupFilterSectionProps {
  /** Set of currently selected group paths (empty = all shown) */
  selected: Set<string>;
  onToggle: (groupPath: string) => void;
  /** Section title (defaults to "Groups") */
  title?: string;
}

/**
 * PanelSection with a checkbox list of project groups.
 * Reads groups from the global project store.
 */
export function GroupFilterSection({
  selected,
  onToggle,
  title = "Groups",
}: GroupFilterSectionProps) {
  const groups = useProjectStore((s) => s.project!.groups);

  return (
    <PanelSection title={title}>
      <div className="space-y-0.5">
        {groups.map((group) => (
          <label
            key={group.path}
            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-panel-hover"
          >
            <input
              type="checkbox"
              checked={selected.size === 0 || selected.has(group.path)}
              onChange={() => onToggle(group.path)}
              className="accent-white"
            />
            <GroupBadge groupPath={group.path} color={group.meta.color} />
          </label>
        ))}
      </div>
    </PanelSection>
  );
}

// ── Assignee Filter Section ─────────────────────────────────────────

interface AssigneeFilterSectionProps {
  /** Section title (e.g. "Helpers", "Task Assignee", "Issue Assignee") */
  title: string;
  /** Set of currently selected helper IDs (empty = all shown) */
  selected: Set<string>;
  onToggle: (helperId: string) => void;
}

/**
 * PanelSection with a checkbox list of project helpers.
 * Reads helpers from the global project store.
 */
export function AssigneeFilterSection({
  title,
  selected,
  onToggle,
}: AssigneeFilterSectionProps) {
  const helpers = useProjectStore((s) => s.project!.helpers);

  return (
    <PanelSection title={title}>
      <div className="space-y-0.5">
        {Object.entries(helpers).map(([id, helper]) => (
          <label
            key={id}
            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-panel-hover"
          >
            <input
              type="checkbox"
              checked={selected.size === 0 || selected.has(id)}
              onChange={() => onToggle(id)}
              className="accent-white"
            />
            <AssigneeBadge label={helper.name} variant="dark" />
          </label>
        ))}
      </div>
    </PanelSection>
  );
}
