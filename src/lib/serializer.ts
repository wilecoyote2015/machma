/**
 * Serialize a Task object back into the .md file format.
 *
 * Round-trip fidelity is critical: parsing then serializing a file
 * should produce output identical to what a human would write,
 * keeping git diffs clean.
 */

import type { Task } from "@/types";

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

  // Description
  parts.push("# Description");
  parts.push(task.description);
  parts.push("");

  // Questions
  parts.push("# Questions");
  for (const q of task.questions) {
    const marker = q.recurring ? " [r]" : "";
    parts.push(`## ${q.title}${marker}`);
    if (q.answer) {
      parts.push("");
      parts.push("### Answer");
      parts.push(q.answer);
    }
    parts.push("");
  }

  // Issues
  parts.push("# Issues");
  for (const issue of task.issues) {
    parts.push(`## ${issue.title}`);
    if (issue.description) {
      parts.push(issue.description);
      parts.push("");
    }
    if (issue.assignee) {
      parts.push("### Assignee");
      parts.push(issue.assignee);
      parts.push("");
    }
    if (issue.solution) {
      parts.push("### Solution");
      parts.push(issue.solution);
      parts.push("");
    }
  }

  // Log
  parts.push("# Log");
  for (const entry of task.log) {
    parts.push(`## ${entry.date} ${entry.title}`);
    if (entry.body) {
      parts.push(entry.body);
    }
  }

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
