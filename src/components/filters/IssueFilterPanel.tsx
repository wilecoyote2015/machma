/**
 * Left sidebar filter panel for the Issues table view.
 *
 * Uses shared filter sections for deadline, groups, and assignees.
 * Issue-specific: status toggle (all/resolved/unresolved) and
 * separate issue-assignee vs task-assignee sections.
 */

import { PanelSection } from "@/components/common/PanelSection";
import { FilterToggleGroup } from "@/components/ui/FilterToggleGroup";
import {
  FilterPanelShell,
  DeadlineFilterSection,
  GroupFilterSection,
  AssigneeFilterSection,
  toggleSet,
} from "@/components/filters/FilterSections";

// ── Filter state types (exported for use by IssueTableView) ─────────

export type IssueStatusFilter = "all" | "resolved" | "unresolved";

/** Complete filter state for the Issues table view */
export interface IssueFilterState {
  issueStatus: IssueStatusFilter;
  issueAssignees: Set<string>;
  taskAssignees: Set<string>;
  groups: Set<string>;
  deadlineStart: string | null;
  deadlineEnd: string | null;
}

export const emptyIssueFilters = (): IssueFilterState => ({
  issueStatus: "all",
  issueAssignees: new Set(),
  taskAssignees: new Set(),
  groups: new Set(),
  deadlineStart: null,
  deadlineEnd: null,
});

const ISSUE_STATUS_OPTIONS: { label: string; value: IssueStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Unresolved", value: "unresolved" },
  { label: "Resolved", value: "resolved" },
];

// ── Component ───────────────────────────────────────────────────────

interface IssueFilterPanelProps {
  filters: IssueFilterState;
  onChange: (filters: IssueFilterState) => void;
}

export function IssueFilterPanel({ filters, onChange }: IssueFilterPanelProps) {
  const hasActiveFilters =
    filters.issueStatus !== "all" ||
    filters.issueAssignees.size > 0 ||
    filters.taskAssignees.size > 0 ||
    filters.groups.size > 0 ||
    filters.deadlineStart !== null ||
    filters.deadlineEnd !== null;

  return (
    <FilterPanelShell
      hasActiveFilters={hasActiveFilters}
      onClearAll={() => onChange(emptyIssueFilters())}
    >
      <PanelSection title="Issue Status">
        <FilterToggleGroup
          options={ISSUE_STATUS_OPTIONS}
          selected={filters.issueStatus}
          onToggle={(v) => onChange({ ...filters, issueStatus: v })}
        />
      </PanelSection>

      <AssigneeFilterSection
        title="Issue Assignee"
        selected={filters.issueAssignees}
        onToggle={(id) => onChange({ ...filters, issueAssignees: toggleSet(filters.issueAssignees, id) })}
      />

      <AssigneeFilterSection
        title="Task Assignee"
        selected={filters.taskAssignees}
        onToggle={(id) => onChange({ ...filters, taskAssignees: toggleSet(filters.taskAssignees, id) })}
      />

      <GroupFilterSection
        title="Task Group"
        selected={filters.groups}
        onToggle={(path) => onChange({ ...filters, groups: toggleSet(filters.groups, path) })}
      />

      <DeadlineFilterSection
        title="Task Deadline"
        start={filters.deadlineStart}
        end={filters.deadlineEnd}
        onStartChange={(v) => onChange({ ...filters, deadlineStart: v })}
        onEndChange={(v) => onChange({ ...filters, deadlineEnd: v })}
      />
    </FilterPanelShell>
  );
}
