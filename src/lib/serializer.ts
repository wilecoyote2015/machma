/**
 * Serialize a Task object back into the .md file format.
 *
 * Round-trip fidelity is critical: parsing then serializing a file
 * should produce output identical to what a human would write,
 * keeping git diffs clean.
 *
 * User headings within content sections are elevated to avoid
 * collision with structural markdown headings:
 *   Description:        +1  (user # → file ##)
 *   Issue description:  +2  (user # → file ###)
 *   Issue solution:     +3  (user # → file ####)
 *   Question answer:    +3  (user # → file ####)
 *   Log body:           +2  (user # → file ###)
 */

import type { Task } from "@/types";
import { elevateHeadings } from "@/lib/headings";

/** Format a list section: items as `- value` lines, or empty. */
function formatList(items: string[]): string {
  if (items.length === 0) return "";
  return items.map((item) => `- ${item}`).join("\n") + "\n";
}

/** Serialize a Task object to the canonical .md string. */
export function serializeTask(task: Task): string {
  const parts: string[] = [];

  // Title + metadata (trailing double-space on metadata lines for md line breaks)
  parts.push(`# ${task.title}`);
  parts.push(`deadline: ${task.deadline}  `);
  if (task.time) parts.push(`time: ${task.time}  `);
  if (task.start_date) parts.push(`start_date: ${task.start_date}  `);
  if (task.start_time) parts.push(`start_time: ${task.start_time}  `);
  parts.push(`assignee: ${task.assignee}  `);
  parts.push(`n_helpers_needed: ${task.n_helpers_needed}  `);
  parts.push(`status: ${task.status}`);
  parts.push("");

  // List sections
  parts.push("## Depends On");
  parts.push(formatList(task.depends_on));

  parts.push("## Tags");
  parts.push(formatList(task.tags));

  parts.push("## External Entities");
  parts.push(formatList(task.external_entities));

  parts.push("## Helpers");
  parts.push(formatList(task.helpers));

  // Description — elevate user headings by +1
  parts.push("# Description");
  parts.push(elevateHeadings(task.description, 1));
  parts.push("");

  // Questions
  parts.push("# Questions");
  for (const q of task.questions) {
    const marker = q.recurring ? " [r]" : "";
    parts.push(`## ${q.title}${marker}`);
    if (q.answer) {
      parts.push("");
      parts.push("### Answer");
      // Elevate user headings in answer by +3
      parts.push(elevateHeadings(q.answer, 3));
    }
    parts.push("");
  }

  // Issues
  parts.push("# Issues");
  for (const issue of task.issues) {
    parts.push(`## ${issue.title}`);
    if (issue.description) {
      // Elevate user headings in issue description by +2
      parts.push(elevateHeadings(issue.description, 2));
      parts.push("");
    }
    if (issue.assignee) {
      parts.push("### Assignee");
      parts.push(issue.assignee);
      parts.push("");
    }
    if (issue.solution) {
      parts.push("### Solution");
      // Elevate user headings in solution by +3
      parts.push(elevateHeadings(issue.solution, 3));
      parts.push("");
    }
  }

  // Log
  parts.push("# Log");
  for (const entry of task.log) {
    parts.push(`## ${entry.date} ${entry.title}`);
    if (entry.body) {
      // Elevate user headings in log body by +2
      parts.push(elevateHeadings(entry.body, 2));
    }
  }

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
