/**
 * Parse a task .md file into a structured Task object.
 *
 * The format is NOT standard markdown frontmatter. It uses:
 * - `# Title` as the first line
 * - `key: value` inline metadata lines (with trailing double-space)
 * - `## Section` headings for list data (Depends On, Tags, etc.)
 * - `# Section` headings for rich content (Description, Questions, Issues, Log)
 * - `### Subsection` for nested data within Questions/Issues
 *
 * The parser is a simple state machine that walks lines top-to-bottom.
 */

import type { Task, TaskStatus, TaskQuestion, TaskIssue, TaskLogEntry } from "@/types";

/** Top-level sections identified by `# Heading` */
type TopSection = "meta" | "description" | "questions" | "issues" | "log";

/** Sub-sections within the metadata area identified by `## Heading` */
type MetaSubSection = "depends_on" | "tags" | "external_entities" | "helpers" | null;

/** Sub-sections within an issue identified by `### Heading` */
type IssueSubSection = "assignee" | "solution" | null;

const META_SUBSECTION_MAP: Record<string, MetaSubSection> = {
  "depends on": "depends_on",
  "tags": "tags",
  "external entities": "external_entities",
  "helpers": "helpers",
};

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

  // Current question/issue/log being built
  let currentQuestion: TaskQuestion | null = null;
  let questionSubSection: "answer" | null = null;

  let currentIssue: TaskIssue | null = null;
  let issueSubSection: IssueSubSection = null;

  let currentLog: TaskLogEntry | null = null;

  /** Flush any in-progress question into the task */
  const flushQuestion = () => {
    if (currentQuestion) {
      currentQuestion.answer = currentQuestion.answer.trim();
      task.questions.push(currentQuestion);
      currentQuestion = null;
      questionSubSection = null;
    }
  };

  /** Flush any in-progress issue into the task */
  const flushIssue = () => {
    if (currentIssue) {
      currentIssue.description = currentIssue.description.trim();
      currentIssue.assignee = currentIssue.assignee.trim();
      currentIssue.solution = currentIssue.solution.trim();
      task.issues.push(currentIssue);
      currentIssue = null;
      issueSubSection = null;
    }
  };

  /** Flush any in-progress log entry into the task */
  const flushLog = () => {
    if (currentLog) {
      currentLog.body = currentLog.body.trim();
      task.log.push(currentLog);
      currentLog = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // ── `# Heading` — top-level section change ────────────────
    if (line.startsWith("# ") && !line.startsWith("## ") && !line.startsWith("### ")) {
      const heading = line.slice(2).trim();

      if (topSection === "meta" && !task.title) {
        // First `# ` heading is the title
        task.title = heading;
        continue;
      }

      // Flush any pending sub-items before switching top section
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

    // ── `## Heading` — second-level heading ───────────────────
    if (line.startsWith("## ") && !line.startsWith("### ")) {
      const heading = line.slice(3).trim();

      if (topSection === "meta") {
        // Sub-section within the metadata area (Depends On, Tags, etc.)
        const key = heading.toLowerCase();
        metaSubSection = META_SUBSECTION_MAP[key] ?? null;
        continue;
      }

      if (topSection === "questions") {
        flushQuestion();
        // Check for [r] recurring marker
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
        // Log heading format: `## YYYY_MM_DD Title text`
        const match = heading.match(/^(\d{4}_\d{2}_\d{2})\s+(.*)$/);
        if (match) {
          currentLog = { date: match[1]!, title: match[2]!, body: "" };
        } else {
          currentLog = { date: "", title: heading, body: "" };
        }
        continue;
      }

      continue;
    }

    // ── `### Heading` — third-level heading ───────────────────
    if (line.startsWith("### ")) {
      const heading = line.slice(4).trim().toLowerCase();

      if (topSection === "questions" && currentQuestion) {
        if (heading === "answer") {
          questionSubSection = "answer";
        }
        continue;
      }

      if (topSection === "issues" && currentIssue) {
        if (heading === "assignee") {
          issueSubSection = "assignee";
        } else if (heading === "solution") {
          issueSubSection = "solution";
        }
        continue;
      }

      continue;
    }

    // ── Content lines ─────────────────────────────────────────

    if (topSection === "meta" && metaSubSection === null) {
      // Parse key: value metadata lines
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
      // Parse list items `- value`
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
      // Lines between ## heading and ### Answer are remarks/context (not captured as structured data)
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

  // Flush any remaining in-progress items
  flushQuestion();
  flushIssue();
  flushLog();
  task.description = task.description.trim();

  return task;
}
