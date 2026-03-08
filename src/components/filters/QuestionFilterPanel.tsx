/**
 * Left sidebar filter panel for the Questions table view.
 *
 * Filters:
 * - Question status: all / answered / unanswered
 * - Task assignee: checkbox list of helpers
 * - Task group: checkbox list of groups
 * - Task deadline: proximity quick-select buttons
 *
 * (Questions have no assignee field, so no question-assignee filter.)
 */

import { useProjectStore } from "@/stores/project-store";
import { PanelSection } from "@/components/common/PanelSection";
import { FilterToggleGroup } from "@/components/ui/FilterToggleGroup";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";

export type QuestionStatusFilter = "all" | "answered" | "unanswered";

/** Complete filter state for the Questions table view */
export interface QuestionFilterState {
  questionStatus: QuestionStatusFilter;
  taskAssignees: Set<string>;
  groups: Set<string>;
  deadlineWithinDays: number | null;
}

export const emptyQuestionFilters = (): QuestionFilterState => ({
  questionStatus: "all",
  taskAssignees: new Set(),
  groups: new Set(),
  deadlineWithinDays: null,
});

const QUESTION_STATUS_OPTIONS: { label: string; value: QuestionStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Unanswered", value: "unanswered" },
  { label: "Answered", value: "answered" },
];

const DEADLINE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "All", value: null },
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

interface QuestionFilterPanelProps {
  filters: QuestionFilterState;
  onChange: (filters: QuestionFilterState) => void;
}

export function QuestionFilterPanel({ filters, onChange }: QuestionFilterPanelProps) {
  const project = useProjectStore((s) => s.project)!;

  const hasActiveFilters =
    filters.questionStatus !== "all" ||
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
            onClick={() => onChange(emptyQuestionFilters())}
            className="text-xs text-white/70 underline hover:text-white"
          >
            Clear all
          </button>
        </div>
      )}

      <PanelSection title="Question Status">
        <FilterToggleGroup
          options={QUESTION_STATUS_OPTIONS}
          selected={filters.questionStatus}
          onToggle={(v) => onChange({ ...filters, questionStatus: v })}
        />
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
