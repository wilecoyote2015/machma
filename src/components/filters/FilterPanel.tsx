/**
 * Left sidebar filter panel.
 * Uses PanelSection for visual consistency with the detail panel,
 * and FilterToggleGroup for consistent toggle styling.
 */

import { useMemo } from "react";
import { useProjectStore } from "@/stores/project-store";
import type { TaskStatus } from "@/types";
import { PanelSection } from "@/components/common/PanelSection";
import { FilterToggleGroup } from "@/components/ui/FilterToggleGroup";
import { IssueIndicator } from "@/components/ui/IssueIndicator";
import { QuestionIndicator } from "@/components/ui/QuestionIndicator";
import { AssigneeBadge } from "@/components/ui/AssigneeBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";

const DEADLINE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "All", value: null },
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

const STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
  { label: "todo", value: "todo" },
  { label: "in progress", value: "in_progress" },
  { label: "finished", value: "finished" },
  { label: "cancelled", value: "cancelled" },
];

export function FilterPanel() {
  const project = useProjectStore((s) => s.project)!;
  const filters = useProjectStore((s) => s.filters);
  const toggleTag = useProjectStore((s) => s.toggleTagFilter);
  const toggleGroup = useProjectStore((s) => s.toggleGroupFilter);
  const toggleHelper = useProjectStore((s) => s.toggleHelperFilter);
  const toggleStatus = useProjectStore((s) => s.toggleStatusFilter);
  const setHasUnresolvedIssues = useProjectStore((s) => s.setHasUnresolvedIssues);
  const setHasUnansweredQuestions = useProjectStore((s) => s.setHasUnansweredQuestions);
  const setDeadlineWithinDays = useProjectStore((s) => s.setDeadlineWithinDays);
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
    filters.statuses.size > 0 ||
    filters.hasUnresolvedIssues ||
    filters.hasUnansweredQuestions ||
    filters.deadlineWithinDays !== null;

  return (
    <div className="space-y-1 text-white">
      {hasActiveFilters && (
        <div className="flex justify-end pb-1">
          <button onClick={clearFilters} className="text-xs text-white/70 underline hover:text-white">
            Clear all
          </button>
        </div>
      )}

      <PanelSection title="Deadline">
        <FilterToggleGroup
          options={DEADLINE_OPTIONS}
          selected={filters.deadlineWithinDays}
          onToggle={(v) => setDeadlineWithinDays(v)}
        />
      </PanelSection>

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
        <FilterToggleGroup options={STATUS_OPTIONS} selected={filters.statuses} onToggle={toggleStatus} />
      </PanelSection>

      <PanelSection title="Tags" defaultOpen={allTags.length > 0}>
        <FilterToggleGroup options={tagOptions} selected={filters.tags} onToggle={toggleTag} />
      </PanelSection>

      <PanelSection title="Groups">
        <div className="space-y-0.5">
          {project.groups.map((group) => (
            <label
              key={group.path}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-panel-hover"
            >
              <input
                type="checkbox"
                checked={filters.groups.size === 0 || filters.groups.has(group.path)}
                onChange={() => toggleGroup(group.path)}
                className="accent-white"
              />
              <GroupBadge groupPath={group.path} color={group.meta.color} />
            </label>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Helpers">
        <div className="space-y-0.5">
          {Object.entries(project.helpers).map(([id, helper]) => (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-panel-hover"
            >
              <input
                type="checkbox"
                checked={filters.helpers.size === 0 || filters.helpers.has(id)}
                onChange={() => toggleHelper(id)}
                className="accent-white"
              />
              <AssigneeBadge label={helper.name} variant="dark" />
            </label>
          ))}
        </div>
      </PanelSection>
    </div>
  );
}
