/**
 * Left sidebar filter panel for the Tasks and Timeline views.
 *
 * Uses shared filter sections for deadline, groups, and helpers.
 * Task-specific sections (flags, status, tags) remain inline.
 */

import { useMemo } from "react";
import { useProjectStore } from "@/stores/project-store";
import { PanelSection } from "@/components/common/PanelSection";
import { FilterToggleGroup } from "@/components/ui/FilterToggleGroup";
import { IssueIndicator } from "@/components/ui/IssueIndicator";
import { QuestionIndicator } from "@/components/ui/QuestionIndicator";
import {
  FilterPanelShell,
  DeadlineFilterSection,
  GroupFilterSection,
  AssigneeFilterSection,
} from "@/components/filters/FilterSections";
import { TASK_STATUS_OPTIONS } from "@/lib/constants";

export function FilterPanel() {
  const project = useProjectStore((s) => s.project)!;
  const filters = useProjectStore((s) => s.filters);
  const toggleTag = useProjectStore((s) => s.toggleTagFilter);
  const toggleGroup = useProjectStore((s) => s.toggleGroupFilter);
  const toggleHelper = useProjectStore((s) => s.toggleHelperFilter);
  const toggleAssignee = useProjectStore((s) => s.toggleAssigneeFilter);
  const toggleStatus = useProjectStore((s) => s.toggleStatusFilter);
  const setHasUnresolvedIssues = useProjectStore((s) => s.setHasUnresolvedIssues);
  const setHasUnansweredQuestions = useProjectStore((s) => s.setHasUnansweredQuestions);
  const setDeadlineStart = useProjectStore((s) => s.setDeadlineStart);
  const setDeadlineEnd = useProjectStore((s) => s.setDeadlineEnd);
  const clearFilters = useProjectStore((s) => s.clearFilters);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of project.tasks) for (const tag of t.tags) set.add(tag);
    return [...set].sort();
  }, [project.tasks]);

  const tagOptions = allTags.map((t) => ({ label: t, value: t }));

  const hasActiveFilters =
    filters.tags.size > 0 ||
    filters.groups.size > 0 ||
    filters.helpers.size > 0 ||
    filters.assignees.size > 0 ||
    filters.statuses.size > 0 ||
    filters.hasUnresolvedIssues ||
    filters.hasUnansweredQuestions ||
    filters.deadlineStart !== null ||
    filters.deadlineEnd !== null;

  return (
    <FilterPanelShell hasActiveFilters={hasActiveFilters} onClearAll={clearFilters}>
      <DeadlineFilterSection
        start={filters.deadlineStart}
        end={filters.deadlineEnd}
        onStartChange={setDeadlineStart}
        onEndChange={setDeadlineEnd}
      />

      <PanelSection title="Flags">
        <div className="space-y-1">
          <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-panel-hover">
            <input
              type="checkbox"
              checked={filters.hasUnresolvedIssues}
              onChange={(e) => setHasUnresolvedIssues(e.target.checked)}
              className="accent-white"
            />
            <IssueIndicator />
            Has unresolved issues
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-panel-hover">
            <input
              type="checkbox"
              checked={filters.hasUnansweredQuestions}
              onChange={(e) => setHasUnansweredQuestions(e.target.checked)}
              className="accent-white"
            />
            <QuestionIndicator />
            Has unanswered questions
          </label>
        </div>
      </PanelSection>

      <PanelSection title="Status">
        <FilterToggleGroup options={TASK_STATUS_OPTIONS} selected={filters.statuses} onToggle={toggleStatus} />
      </PanelSection>

      <PanelSection title="Tags" defaultOpen={allTags.length > 0}>
        <FilterToggleGroup options={tagOptions} selected={filters.tags} onToggle={toggleTag} />
      </PanelSection>

      <GroupFilterSection
        selected={filters.groups}
        onToggle={toggleGroup}
      />

      <AssigneeFilterSection
        title="Assignee"
        selected={filters.assignees}
        onToggle={toggleAssignee}
      />

      <AssigneeFilterSection
        title="Helpers"
        selected={filters.helpers}
        onToggle={toggleHelper}
      />
    </FilterPanelShell>
  );
}
