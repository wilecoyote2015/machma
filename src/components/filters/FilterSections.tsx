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
import { formatDate } from "@/lib/dates";
import { PanelSection } from "@/components/common/PanelSection";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { PersonBadge } from "@/components/ui/PersonBadge";

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

/** Preset definitions: each sets the start and end date relative to today. */
const DEADLINE_PRESETS: { label: string; days: number }[] = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];


interface DeadlineFilterSectionProps {
  /** Start of deadline range (YYYY-MM-DD) or null for no lower bound */
  start: string | null;
  /** End of deadline range (YYYY-MM-DD) or null for no upper bound */
  end: string | null;
  onStartChange: (date: string | null) => void;
  onEndChange: (date: string | null) => void;
  /** Section title (defaults to "Deadline") */
  title?: string;
}

/**
 * PanelSection with deadline date range: two date inputs plus preset buttons.
 * Presets fill in the From/To fields; the user can adjust them manually.
 * Reads the project anchor date from the store for the "Anchor" preset.
 */
export function DeadlineFilterSection({
  start,
  end,
  onStartChange,
  onEndChange,
  title = "Deadline",
}: DeadlineFilterSectionProps) {
  const anchorDate = useProjectStore((s) => s.project?.meta.anchor_date);
  /** Check if the current range matches a preset (today → today+N days). */
  const today = formatDate(new Date());
  const activePreset = DEADLINE_PRESETS.find((p) => {
    const presetEnd = new Date();
    presetEnd.setDate(presetEnd.getDate() + p.days);
    return start === today && end === formatDate(presetEnd);
  });

  const isAll = !start && !end;
  const isAnchor = !!anchorDate && start === anchorDate && end === anchorDate;

  return (
    <PanelSection title={title}>
      <div className="space-y-2">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => { onStartChange(null); onEndChange(null); }}
            className={`rounded px-2 py-0.5 text-xs font-medium transition ${
              isAll ? "bg-white text-primary" : "bg-primary-muted text-white hover:bg-primary-light"
            }`}
          >
            {isAll && "✓ "}All
          </button>
          {anchorDate && (
            <button
              onClick={() => { onStartChange(anchorDate); onEndChange(anchorDate); }}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                isAnchor ? "bg-white text-primary" : "bg-primary-muted text-white hover:bg-primary-light"
              }`}
            >
              {isAnchor && "✓ "}Anchor
            </button>
          )}
          {DEADLINE_PRESETS.map((p) => {
            const active = !isAnchor && activePreset === p;
            return (
              <button
                key={p.days}
                onClick={() => {
                  const todayStr = formatDate(new Date());
                  const endDate = new Date();
                  endDate.setDate(endDate.getDate() + p.days);
                  onStartChange(todayStr);
                  onEndChange(formatDate(endDate));
                }}
                className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                  active ? "bg-white text-primary" : "bg-primary-muted text-white hover:bg-primary-light"
                }`}
              >
                {active && "✓ "}{p.label}
              </button>
            );
          })}
        </div>

        {/* Date range inputs */}
        <div className="flex items-center gap-1.5 text-xs">
          <label className="w-10 shrink-0 font-medium text-white/80">From</label>
          <input
            type="date"
            value={start ?? ""}
            onChange={(e) => onStartChange(e.target.value || null)}
            className="input-panel flex-1 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <label className="w-10 shrink-0 font-medium text-white/80">To</label>
          <input
            type="date"
            value={end ?? ""}
            onChange={(e) => onEndChange(e.target.value || null)}
            className="input-panel flex-1 text-xs"
          />
        </div>
      </div>
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
            <PersonBadge name={helper.name} color={helper.color || undefined} />
          </label>
        ))}
      </div>
    </PanelSection>
  );
}
