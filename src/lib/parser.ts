/**
 * Parse a task .md file into a structured Task object.
 *
 * The format uses:
 * - `# Title` as the first line
 * - `key: value` inline metadata lines (with trailing double-space)
 * - `## Section` headings for list data (Depends On, Tags, etc.)
 * - `# Section` headings for rich content (Description, Questions, Issues, Log)
 * - `### Subsection` for nested data within Questions/Issues
 *
 * User-written headings inside content sections (Description, Issue body, etc.)
 * are stored elevated in the file (e.g. user's `#` → `##` in Description).
 * The parser demotes them back to normal levels after extraction.
 */

import type { Task, TaskStatus, TaskQuestion, TaskIssue, TaskLogEntry } from "@/types";
import { demoteHeadings } from "@/lib/headings";

/** Top-level sections identified by `# Heading` */
type TopSection = "meta" | "description" | "questions" | "issues" | "log";

/** Sub-sections within the metadata area identified by `## Heading` */
type MetaSubSection = "depends_on" | "tags" | "external_entities" | "helpers" | null;

const META_SUBSECTION_MAP: Record<string, MetaSubSection> = {
  "depends on": "depends_on",
  "tags": "tags",
  "external entities": "external_entities",
  "helpers": "helpers",
};

/** Known structural ### headings within the issues section */
const ISSUE_STRUCTURAL_H3 = new Set(["assignee", "solution"]);

function createEmptyTask(id: string, group: string): Task {
  return {
    id,
    group,
    title: "",
    deadline: "",
    assignee: "",
    n_helpers_needed: 0,
    status: "todo",
    depends_on: [],
    tags: [],
    external_entities: [],
    helpers: [],
    description: "",
    questions: [],
    issues: [],
    log: [],
  };
}

/**
 * Parse raw markdown content of a task file into a Task object.
 * @param content - The raw text content of the .md file
 * @param id - Task identifier (filename without .md)
 * @param group - Group path (directory relative to tasks/)
 */
export function parseTask(content: string, id: string, group: string): Task {
  const task = createEmptyTask(id, group);
  const lines = content.split("\n");

  let topSection: TopSection = "meta";
  let metaSubSection: MetaSubSection = null;

  let currentQuestion: TaskQuestion | null = null;
  let questionSubSection: "answer" | null = null;

  let currentIssue: TaskIssue | null = null;
  let issueSubSection: "assignee" | "solution" | null = null;

  let currentLog: TaskLogEntry | null = null;

  const flushQuestion = () => {
    if (currentQuestion) {
      currentQuestion.answer = demoteHeadings(currentQuestion.answer.trim(), 3);
      task.questions.push(currentQuestion);
      currentQuestion = null;
      questionSubSection = null;
    }
  };

  const flushIssue = () => {
    if (currentIssue) {
      currentIssue.description = demoteHeadings(currentIssue.description.trim(), 2);
      currentIssue.assignee = currentIssue.assignee.trim();
      currentIssue.solution = demoteHeadings(currentIssue.solution.trim(), 3);
      task.issues.push(currentIssue);
      currentIssue = null;
      issueSubSection = null;
    }
  };

  const flushLog = () => {
    if (currentLog) {
      currentLog.body = demoteHeadings(currentLog.body.trim(), 2);
      task.log.push(currentLog);
      currentLog = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // ── `# Heading` — top-level section boundaries (always structural) ──
    if (/^# (?!#)/.test(line)) {
      const heading = line.slice(2).trim();

      if (topSection === "meta" && !task.title) {
        task.title = heading;
        continue;
      }

      flushQuestion();
      flushIssue();
      flushLog();

      const headingLower = heading.toLowerCase();
      if (headingLower === "description") {
        topSection = "description";
      } else if (headingLower === "questions") {
        topSection = "questions";
      } else if (headingLower === "issues") {
        topSection = "issues";
      } else if (headingLower === "log") {
        topSection = "log";
      }
      continue;
    }

    // ── `## Heading` — structural only in certain sections ──────────
    if (/^## (?!#)/.test(line)) {
      const heading = line.slice(3).trim();

      if (topSection === "meta") {
        metaSubSection = META_SUBSECTION_MAP[heading.toLowerCase()] ?? null;
        continue;
      }

      if (topSection === "questions") {
        flushQuestion();
        const recurring = /\[r\]\s*$/.test(heading);
        const title = heading.replace(/\s*\[r\]\s*$/, "");
        currentQuestion = { title, recurring, answer: "" };
        questionSubSection = null;
        continue;
      }

      if (topSection === "issues") {
        flushIssue();
        currentIssue = { title: heading, description: "", assignee: "", solution: "" };
        issueSubSection = null;
        continue;
      }

      if (topSection === "log") {
        flushLog();
        const match = heading.match(/^(\d{4}_\d{2}_\d{2})\s+(.*)$/);
        currentLog = match
          ? { date: match[1]!, title: match[2]!, body: "" }
          : { date: "", title: heading, body: "" };
        continue;
      }

      // In description/other: NOT structural → fall through to content
    }

    // ── `### Heading` — structural only for Answer/Assignee/Solution ──
    if (/^### (?!#)/.test(line)) {
      const heading = line.slice(4).trim().toLowerCase();

      if (topSection === "questions" && currentQuestion && heading === "answer") {
        questionSubSection = "answer";
        continue;
      }

      if (topSection === "issues" && currentIssue && ISSUE_STRUCTURAL_H3.has(heading)) {
        issueSubSection = heading as "assignee" | "solution";
        continue;
      }

      // In all other contexts: NOT structural → fall through to content
    }

    // ── Content lines (including non-structural heading lines) ────────

    if (topSection === "meta" && metaSubSection === null) {
      const metaMatch = line.match(/^(\w+):\s*(.*)$/);
      if (metaMatch) {
        const [, key, value] = metaMatch;
        switch (key) {
          case "deadline":
            task.deadline = value!.trim();
            break;
          case "assignee":
            task.assignee = value!.trim();
            break;
          case "n_helpers_needed":
            task.n_helpers_needed = parseInt(value!.trim(), 10) || 0;
            break;
          case "status":
            task.status = value!.trim() as TaskStatus;
            break;
        }
      }
      continue;
    }

    if (topSection === "meta" && metaSubSection !== null) {
      const listMatch = line.match(/^-\s+(.+)$/);
      if (listMatch) {
        task[metaSubSection].push(listMatch[1]!.trim());
      }
      continue;
    }

    if (topSection === "description") {
      task.description += line + "\n";
      continue;
    }

    if (topSection === "questions" && currentQuestion) {
      if (questionSubSection === "answer") {
        currentQuestion.answer += line + "\n";
      }
      continue;
    }

    if (topSection === "issues" && currentIssue) {
      if (issueSubSection === "assignee") {
        currentIssue.assignee += line + "\n";
      } else if (issueSubSection === "solution") {
        currentIssue.solution += line + "\n";
      } else {
        currentIssue.description += line + "\n";
      }
      continue;
    }

    if (topSection === "log" && currentLog) {
      currentLog.body += line + "\n";
      continue;
    }
  }

  flushQuestion();
  flushIssue();
  flushLog();
  task.description = demoteHeadings(task.description.trim(), 1);

  return task;
}
