/**
 * Left sidebar filter panel for the Issues table view.
 *
 * Filters:
 * - Issue status: all / resolved / unresolved
 * - Issue assignee: checkbox list of helpers
 * - Task assignee: checkbox list of helpers
 * - Task group: checkbox list of groups
 * - Task deadline: proximity quick-select buttons
 */

import { useProjectStore } from "@/stores/project-store";
import { PanelSection } from "@/components/common/PanelSection";
import { FilterToggleGroup } from "@/components/ui/FilterToggleGroup";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";

export type IssueStatusFilter = "all" | "resolved" | "unresolved";

/** Complete filter state for the Issues table view */
export interface IssueFilterState {
  issueStatus: IssueStatusFilter;
  issueAssignees: Set<string>;
  taskAssignees: Set<string>;
  groups: Set<string>;
  deadlineWithinDays: number | null;
}

export const emptyIssueFilters = (): IssueFilterState => ({
  issueStatus: "all",
  issueAssignees: new Set(),
  taskAssignees: new Set(),
  groups: new Set(),
  deadlineWithinDays: null,
});

const ISSUE_STATUS_OPTIONS: { label: string; value: IssueStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Unresolved", value: "unresolved" },
  { label: "Resolved", value: "resolved" },
];

const DEADLINE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "All", value: null },
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

interface IssueFilterPanelProps {
  filters: IssueFilterState;
  onChange: (filters: IssueFilterState) => void;
}

export function IssueFilterPanel({ filters, onChange }: IssueFilterPanelProps) {
  const project = useProjectStore((s) => s.project)!;

  const hasActiveFilters =
    filters.issueStatus !== "all" ||
    filters.issueAssignees.size > 0 ||
    filters.taskAssignees.size > 0 ||
    filters.groups.size > 0 ||
    filters.deadlineWithinDays !== null;

  /** Toggle a value in a Set, returning a new Set */
  const toggleSet = (set: Set<string>, value: string): Set<string> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <div className="space-y-1 text-white">
      {hasActiveFilters && (
        <div className="flex justify-end pb-1">
          <button
            onClick={() => onChange(emptyIssueFilters())}
            className="text-xs text-white/70 underline hover:text-white"
          >
            Clear all
          </button>
        </div>
      )}

      <PanelSection title="Issue Status">
        <FilterToggleGroup
          options={ISSUE_STATUS_OPTIONS}
          selected={filters.issueStatus}
          onToggle={(v) => onChange({ ...filters, issueStatus: v })}
        />
      </PanelSection>

      <PanelSection title="Issue Assignee">
        <div className="space-y-0.5">
          {Object.entries(project.helpers).map(([id, helper]) => (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-panel-hover"
            >
              <input
                type="checkbox"
                checked={filters.issueAssignees.size === 0 || filters.issueAssignees.has(id)}
                onChange={() =>
                  onChange({ ...filters, issueAssignees: toggleSet(filters.issueAssignees, id) })
                }
                className="accent-white"
              />
              <AssigneeBadge label={helper.name} variant="dark" />
            </label>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Task Assignee">
        <div className="space-y-0.5">
          {Object.entries(project.helpers).map(([id, helper]) => (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-panel-hover"
            >
              <input
                type="checkbox"
                checked={filters.taskAssignees.size === 0 || filters.taskAssignees.has(id)}
                onChange={() =>
                  onChange({ ...filters, taskAssignees: toggleSet(filters.taskAssignees, id) })
                }
                className="accent-white"
              />
              <AssigneeBadge label={helper.name} variant="dark" />
            </label>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Task Group">
        <div className="space-y-0.5">
          {project.groups.map((group) => (
            <label
              key={group.path}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-panel-hover"
            >
              <input
                type="checkbox"
                checked={filters.groups.size === 0 || filters.groups.has(group.path)}
                onChange={() =>
                  onChange({ ...filters, groups: toggleSet(filters.groups, group.path) })
                }
                className="accent-white"
              />
              <GroupBadge groupPath={group.path} color={group.meta.color} />
            </label>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Task Deadline">
        <FilterToggleGroup
          options={DEADLINE_OPTIONS}
          selected={filters.deadlineWithinDays}
          onToggle={(v) => onChange({ ...filters, deadlineWithinDays: v })}
        />
      </PanelSection>
    </div>
  );
}
