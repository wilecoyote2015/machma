/**
 * Shared task filtering logic used by both the timeline and table views.
 */

import type { Task, FilterState } from "@/types";
import { resolveDeadline } from "@/lib/dates";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Apply all active filters to a task list.
 * Returns only tasks that pass every enabled filter.
 */
export function applyFilters(
  tasks: Task[],
  filters: FilterState,
  anchorDate: string,
): Task[] {
  const now = Date.now();

  return tasks.filter((task) => {
    if (filters.tags.size > 0 && !task.tags.some((t) => filters.tags.has(t)))
      return false;

    if (filters.groups.size > 0 && !filters.groups.has(task.group))
      return false;

    if (filters.assignees.size > 0 && !filters.assignees.has(task.assignee))
      return false;

    if (
      filters.helpers.size > 0 &&
      !task.helpers.some((h) => filters.helpers.has(h))
    )
      return false;

    if (filters.statuses.size > 0 && !filters.statuses.has(task.status))
      return false;

    if (filters.hasUnresolvedIssues) {
      const has = task.issues.some((i) => !i.assignee && !i.solution);
      if (!has) return false;
    }

    if (filters.hasUnansweredQuestions) {
      const has = task.questions.some((q) => !q.answer.trim());
      if (!has) return false;
    }

    if (filters.deadlineWithinDays !== null) {
      const date = resolveDeadline(task.deadline, anchorDate);
      if (!date) return false;
      const daysUntil = (date.getTime() - now) / MS_PER_DAY;
      if (daysUntil > filters.deadlineWithinDays) return false;
    }

    return true;
  });
}
