/**
 * Right sidebar panel showing the full detail of a selected task.
 *
 * Organized into collapsible sections:
 * - Metadata (deadline, status, assignee, group)
 * - Helpers (merged: n_helpers_needed + assigned helpers in one section)
 * - Dependencies, Tags, External Entities (chip lists)
 * - Description (markdown)
 * - Questions
 * - Issues
 * - Log
 */

import { useCallback } from "react";
import type { Task, TaskStatus, TaskQuestion, TaskIssue, TaskLogEntry } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { MarkdownBlock } from "@/components/common/MarkdownBlock";
import { CollapsibleSection } from "@/components/common/CollapsibleSection";
import { ChipList } from "@/components/detail/ChipList";
import { resolveDeadline, formatDateTime } from "@/lib/dates";

const STATUS_OPTIONS: TaskStatus[] = ["todo", "in_progress", "finished", "cancelled"];

interface TaskDetailProps {
  task: Task;
}

export function TaskDetail({ task }: TaskDetailProps) {
  const project = useProjectStore((s) => s.project)!;
  const updateTask = useProjectStore((s) => s.updateTask);
  const deleteTask = useProjectStore((s) => s.deleteTask);
  const selectTask = useProjectStore((s) => s.selectTask);

  const updateField = useCallback(
    <K extends keyof Task>(field: K, value: Task[K]) => {
      updateTask({ ...task, [field]: value });
    },
    [task, updateTask],
  );

  const resolvedDate = resolveDeadline(task.deadline, project.meta.anchor_date);
  const helperIds = Object.keys(project.helpers);
  const taskIds = project.tasks.map((t) => t.id).filter((id) => id !== task.id);
  const entityIds = Object.keys(project.external_entities);

  const unresolvedIssueCount = task.issues.filter((i) => !i.assignee && !i.solution).length;
  const unansweredQuestionCount = task.questions.filter((q) => !q.answer.trim()).length;

  return (
    <div className="space-y-4 text-white">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <h2 className="text-xl font-bold">{task.title}</h2>
        <button
          onClick={() => selectTask(null)}
          className="text-white/70 hover:text-white"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* ── Metadata ─────────────────────────────────────── */}
      <CollapsibleSection title="Metadata">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold">Deadline</label>
            <input
              value={task.deadline}
              onChange={(e) => updateField("deadline", e.target.value)}
              className="flex-1 rounded border border-white/30 bg-white/10 px-2 py-1 text-white placeholder-white/50 focus:border-white focus:outline-none"
              placeholder="-5d or 2026-05-01"
            />
            {resolvedDate && (
              <span className="text-xs text-white/70">{formatDateTime(resolvedDate)}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold">Status</label>
            <select
              value={task.status}
              onChange={(e) => updateField("status", e.target.value as TaskStatus)}
              className="flex-1 rounded border border-white/30 bg-white/10 px-2 py-1 text-white focus:border-white focus:outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="text-black">
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold">Assignee</label>
            <select
              value={task.assignee}
              onChange={(e) => updateField("assignee", e.target.value)}
              className="flex-1 rounded border border-white/30 bg-white/10 px-2 py-1 text-white focus:border-white focus:outline-none"
            >
              <option value="" className="text-black">—</option>
              {helperIds.map((id) => (
                <option key={id} value={id} className="text-black">
                  {id} ({project.helpers[id]!.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold">Group</label>
            <span>{task.group || "—"}</span>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Helpers (merged) ──────────────────────────────── */}
      <CollapsibleSection
        title="Helpers"
        badge={`${task.helpers.length}/${task.n_helpers_needed}`}
      >
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <label className="font-semibold">Required:</label>
            <input
              type="number"
              min={0}
              value={task.n_helpers_needed}
              onChange={(e) => updateField("n_helpers_needed", parseInt(e.target.value, 10) || 0)}
              className="w-16 rounded border border-white/30 bg-white/10 px-2 py-1 text-white focus:border-white focus:outline-none"
            />
          </div>
          <ChipList
            label="Assigned"
            items={task.helpers}
            suggestions={helperIds}
            renderLabel={(id) => project.helpers[id]?.name ?? id}
            onChange={(items) => updateField("helpers", items)}
          />
        </div>
      </CollapsibleSection>

      {/* ── Relations ─────────────────────────────────────── */}
      <CollapsibleSection title="Relations" defaultOpen={false}>
        <div className="space-y-3">
          <ChipList
            label="Depends On"
            items={task.depends_on}
            suggestions={taskIds}
            onChange={(items) => updateField("depends_on", items)}
          />
          <ChipList
            label="Tags"
            items={task.tags}
            allowCustom
            onChange={(items) => updateField("tags", items)}
          />
          <ChipList
            label="Ext. Entities"
            items={task.external_entities}
            suggestions={entityIds}
            renderLabel={(id) => project.external_entities[id]?.name ?? id}
            onChange={(items) => updateField("external_entities", items)}
          />
        </div>
      </CollapsibleSection>

      {/* ── Description ──────────────────────────────────── */}
      <CollapsibleSection title="Description">
        <div className="rounded bg-white p-2 text-gray-800">
          <MarkdownBlock
            content={task.description}
            onSave={(content) => updateField("description", content)}
            placeholder="No description"
          />
        </div>
      </CollapsibleSection>

      {/* ── Questions ────────────────────────────────────── */}
      <CollapsibleSection
        title="Questions"
        badge={unansweredQuestionCount > 0 ? `${unansweredQuestionCount} unanswered` : `${task.questions.length}`}
        defaultOpen={task.questions.length > 0}
      >
        {task.questions.map((q, i) => (
          <QuestionItem
            key={i}
            question={q}
            onUpdate={(updated) => {
              const questions = [...task.questions];
              questions[i] = updated;
              updateField("questions", questions);
            }}
            onRemove={() => {
              updateField("questions", task.questions.filter((_, j) => j !== i));
            }}
          />
        ))}
        <button
          onClick={() =>
            updateField("questions", [
              ...task.questions,
              { title: "New question", recurring: false, answer: "" },
            ])
          }
          className="mt-1 text-sm text-white/70 hover:text-white"
        >
          + Add question
        </button>
      </CollapsibleSection>

      {/* ── Issues ───────────────────────────────────────── */}
      <CollapsibleSection
        title="Issues"
        badge={unresolvedIssueCount > 0 ? `${unresolvedIssueCount} open` : `${task.issues.length}`}
        defaultOpen={task.issues.length > 0}
      >
        {task.issues.map((issue, i) => (
          <IssueItem
            key={i}
            issue={issue}
            helperIds={helperIds}
            onUpdate={(updated) => {
              const issues = [...task.issues];
              issues[i] = updated;
              updateField("issues", issues);
            }}
            onRemove={() => {
              updateField("issues", task.issues.filter((_, j) => j !== i));
            }}
          />
        ))}
        <button
          onClick={() =>
            updateField("issues", [
              ...task.issues,
              { title: "New issue", description: "", assignee: "", solution: "" },
            ])
          }
          className="mt-1 text-sm text-white/70 hover:text-white"
        >
          + Add issue
        </button>
      </CollapsibleSection>

      {/* ── Log ──────────────────────────────────────────── */}
      <CollapsibleSection
        title="Log"
        badge={`${task.log.length}`}
        defaultOpen={task.log.length > 0}
      >
        {task.log.map((entry, i) => (
          <LogItem
            key={i}
            entry={entry}
            onUpdate={(updated) => {
              const log = [...task.log];
              log[i] = updated;
              updateField("log", log);
            }}
            onRemove={() => {
              updateField("log", task.log.filter((_, j) => j !== i));
            }}
          />
        ))}
        <button
          onClick={() => {
            const today = new Date();
            const dateStr = `${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, "0")}_${String(today.getDate()).padStart(2, "0")}`;
            updateField("log", [
              ...task.log,
              { date: dateStr, title: "New entry", body: "" },
            ]);
          }}
          className="mt-1 text-sm text-white/70 hover:text-white"
        >
          + Add log entry
        </button>
      </CollapsibleSection>

      {/* ── Delete ───────────────────────────────────────── */}
      <div className="border-t border-white/20 pt-3">
        <button
          onClick={() => {
            if (confirm(`Delete task "${task.title}"?`)) {
              deleteTask(task);
            }
          }}
          className="text-sm text-red-300 hover:text-red-100"
        >
          Delete task...
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function QuestionItem({
  question,
  onUpdate,
  onRemove,
}: {
  question: TaskQuestion;
  onUpdate: (q: TaskQuestion) => void;
  onRemove: () => void;
}) {
  const answered = !!question.answer.trim();
  return (
    <div className="mb-2 rounded bg-white/10 p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <input
            value={question.title}
            onChange={(e) => onUpdate({ ...question, title: e.target.value })}
            className="w-full bg-transparent text-sm font-medium text-white focus:outline-none"
          />
          <label className="mt-1 flex items-center gap-1 text-xs text-white/70">
            <input
              type="checkbox"
              checked={question.recurring}
              onChange={(e) => onUpdate({ ...question, recurring: e.target.checked })}
              className="accent-white"
            />
            Recurring
          </label>
        </div>
        <div className="flex items-center gap-1">
          {!answered && (
            <span className="text-xs text-orange-300" title="Unanswered">?</span>
          )}
          <button onClick={onRemove} className="text-xs text-white/50 hover:text-red-300">✕</button>
        </div>
      </div>
      <div className="mt-1 rounded bg-white p-1 text-gray-800">
        <MarkdownBlock
          content={question.answer}
          onSave={(answer) => onUpdate({ ...question, answer })}
          placeholder="No answer yet"
        />
      </div>
    </div>
  );
}

function IssueItem({
  issue,
  helperIds,
  onUpdate,
  onRemove,
}: {
  issue: TaskIssue;
  helperIds: string[];
  onUpdate: (i: TaskIssue) => void;
  onRemove: () => void;
}) {
  const resolved = !!issue.solution.trim();
  return (
    <div className={`mb-2 rounded p-2 ${resolved ? "bg-white/10" : "bg-red-700/30"}`}>
      <div className="flex items-start justify-between gap-2">
        <input
          value={issue.title}
          onChange={(e) => onUpdate({ ...issue, title: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium text-white focus:outline-none"
        />
        <button onClick={onRemove} className="text-xs text-white/50 hover:text-red-300">✕</button>
      </div>
      <div className="mt-1 rounded bg-white p-1 text-gray-800">
        <MarkdownBlock
          content={issue.description}
          onSave={(description) => onUpdate({ ...issue, description })}
          placeholder="Describe the issue..."
        />
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <label className="font-semibold">Assignee:</label>
        <select
          value={issue.assignee}
          onChange={(e) => onUpdate({ ...issue, assignee: e.target.value })}
          className="rounded border border-white/30 bg-white/10 px-1 py-0.5 text-white focus:outline-none"
        >
          <option value="" className="text-black">—</option>
          {helperIds.map((id) => (
            <option key={id} value={id} className="text-black">{id}</option>
          ))}
        </select>
      </div>
      <div className="mt-1">
        <label className="text-xs font-semibold">Solution:</label>
        <div className="rounded bg-white p-1 text-gray-800">
          <MarkdownBlock
            content={issue.solution}
            onSave={(solution) => onUpdate({ ...issue, solution })}
            placeholder="No solution yet"
          />
        </div>
      </div>
    </div>
  );
}

function LogItem({
  entry,
  onUpdate,
  onRemove,
}: {
  entry: TaskLogEntry;
  onUpdate: (e: TaskLogEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mb-2 rounded bg-white/10 p-2">
      <div className="flex items-center gap-2">
        <input
          value={entry.date}
          onChange={(e) => onUpdate({ ...entry, date: e.target.value })}
          className="w-24 bg-transparent text-xs text-white/70 focus:outline-none"
          placeholder="YYYY_MM_DD"
        />
        <input
          value={entry.title}
          onChange={(e) => onUpdate({ ...entry, title: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium text-white focus:outline-none"
        />
        <button onClick={onRemove} className="text-xs text-white/50 hover:text-red-300">✕</button>
      </div>
      <div className="mt-1 rounded bg-white p-1 text-gray-800">
        <MarkdownBlock
          content={entry.body}
          onSave={(body) => onUpdate({ ...entry, body })}
          placeholder="Log details..."
        />
      </div>
    </div>
  );
}
