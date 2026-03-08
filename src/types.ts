// ── Project-level types ────────────────────────────────────────────

/** Top-level project metadata from project.json */
export interface ProjectMeta {
  /** Display name of the project */
  name: string;
  /** Reference date (YYYY-MM-DD); task deadlines are relative to this */
  anchor_date: string;
}

// ── People & entities ──────────────────────────────────────────────

/** An internal helper (from helpers.json), keyed by short ID */
export interface Helper {
  name: string;
  email: string;
  phone: string;
  address: string;
  /** Optional hex color for display in badges and filters (e.g. "#3B82F6") */
  color: string;
}

/** An external contact/organisation (from external_entities.json), keyed by short ID */
export interface ExternalEntity {
  name: string;
  description: string;
  type: string;
  email: string;
  phone: string;
  address: string;
}

// ── Task group ─────────────────────────────────────────────────────

/** Metadata for a task group directory (from group.json) */
export interface GroupMeta {
  /** Hex color for UI display; defaults to grey */
  color: string;
  /** Short description of the group */
  description: string;
}

/**
 * A resolved task group, combining its directory path info
 * with optional metadata from group.json.
 */
export interface TaskGroup {
  /** Slash-separated path relative to tasks/, e.g. "misc" or "misc/sub" */
  path: string;
  /** Directory name used as display label */
  name: string;
  /** Parsed group.json (if present) */
  meta: GroupMeta;
}

// ── Task ───────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "finished" | "cancelled";

/** A question attached to a task */
export interface TaskQuestion {
  /** The question text (## heading content) */
  title: string;
  /** Whether this question recurs across iterations ([r] marker) */
  recurring: boolean;
  /** Answer text (may be empty if unanswered) */
  answer: string;
}

/** An issue/problem attached to a task */
export interface TaskIssue {
  /** The issue title (## heading content) */
  title: string;
  /** Issue description body text */
  description: string;
  /** Helper ID assigned to resolve this issue (empty = unassigned) */
  assignee: string;
  /** Solution text (empty = unresolved) */
  solution: string;
}

/** A chronological log entry */
export interface TaskLogEntry {
  /** Date string in YYYY_MM_DD format */
  date: string;
  /** Short title from the ## heading (after the date) */
  title: string;
  /** Free-text body of the log entry */
  body: string;
}

/** A fully parsed task (from a .md file) */
export interface Task {
  /** Unique ID = filename without .md extension */
  id: string;
  /** Group path this task belongs to (e.g. "misc" or "pferd") */
  group: string;
  /** Task title (# heading) */
  title: string;

  // ── Metadata fields ────────────────────────────────
  /** Deadline: relative offset ("-5d"), absolute date, or absolute datetime */
  deadline: string;
  /** Optional time of day for the deadline in HH:MM format (empty = no time) */
  time: string;
  /** Helper ID of the primary assignee */
  assignee: string;
  /** Number of helpers needed */
  n_helpers_needed: number;
  /** Current task status */
  status: TaskStatus;

  // ── List sections ──────────────────────────────────
  /** Task IDs this task depends on */
  depends_on: string[];
  /** Free-form tags */
  tags: string[];
  /** External entity IDs referenced by this task */
  external_entities: string[];
  /** Helper IDs assigned to support this task */
  helpers: string[];

  // ── Rich sections ──────────────────────────────────
  /** Markdown description body */
  description: string;
  /** Structured questions */
  questions: TaskQuestion[];
  /** Structured issues */
  issues: TaskIssue[];
  /** Chronological log entries */
  log: TaskLogEntry[];
}

// ── Assembled project ──────────────────────────────────────────────

/**
 * The complete in-memory representation of a loaded project.
 * Built by the project-loader from the filesystem.
 */
export interface Project {
  meta: ProjectMeta;
  helpers: Record<string, Helper>;
  external_entities: Record<string, ExternalEntity>;
  groups: TaskGroup[];
  tasks: Task[];
}

// ── Filter state ───────────────────────────────────────────────────

export interface FilterState {
  /** Only show tasks with these tags (empty = no tag filter) */
  tags: Set<string>;
  /** Only show tasks in these group paths (empty = show all) */
  groups: Set<string>;
  /** Only show tasks with these helper IDs in their helpers list (empty = show all) */
  helpers: Set<string>;
  /** Only show tasks with these helper IDs as assignee (empty = show all) */
  assignees: Set<string>;
  /** Only show tasks with these statuses (empty = show all) */
  statuses: Set<TaskStatus>;
  /** If true, only show tasks with unresolved issues */
  hasUnresolvedIssues: boolean;
  /** If true, only show tasks with unanswered questions */
  hasUnansweredQuestions: boolean;
  /** Only show tasks with deadline on or after this date (YYYY-MM-DD, null = no lower bound) */
  deadlineStart: string | null;
  /** Only show tasks with deadline on or before this date (YYYY-MM-DD, null = no upper bound) */
  deadlineEnd: string | null;
}
