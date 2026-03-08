/**
 * Left sidebar filter panel for the Questions table view.
 *
 * Uses shared filter sections for deadline, groups, and assignees.
 * Question-specific: status toggle (all/answered/unanswered).
 * (Questions have no assignee field, so no question-assignee filter.)
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

// ── Filter state types (exported for use by QuestionTableView) ──────

export type QuestionStatusFilter = "all" | "answered" | "unanswered";

/** Complete filter state for the Questions table view */
export interface QuestionFilterState {
  questionStatus: QuestionStatusFilter;
  taskAssignees: Set<string>;
  groups: Set<string>;
  deadlineStart: string | null;
  deadlineEnd: string | null;
}

export const emptyQuestionFilters = (): QuestionFilterState => ({
  questionStatus: "all",
  taskAssignees: new Set(),
  groups: new Set(),
  deadlineStart: null,
  deadlineEnd: null,
});

const QUESTION_STATUS_OPTIONS: { label: string; value: QuestionStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Unanswered", value: "unanswered" },
  { label: "Answered", value: "answered" },
];

// ── Component ───────────────────────────────────────────────────────

interface QuestionFilterPanelProps {
  filters: QuestionFilterState;
  onChange: (filters: QuestionFilterState) => void;
}

export function QuestionFilterPanel({ filters, onChange }: QuestionFilterPanelProps) {
  const hasActiveFilters =
    filters.questionStatus !== "all" ||
    filters.taskAssignees.size > 0 ||
    filters.groups.size > 0 ||
    filters.deadlineStart !== null ||
    filters.deadlineEnd !== null;

  return (
    <FilterPanelShell
      hasActiveFilters={hasActiveFilters}
      onClearAll={() => onChange(emptyQuestionFilters())}
    >
      <PanelSection title="Question Status">
        <FilterToggleGroup
          options={QUESTION_STATUS_OPTIONS}
          selected={filters.questionStatus}
          onToggle={(v) => onChange({ ...filters, questionStatus: v })}
        />
      </PanelSection>

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
