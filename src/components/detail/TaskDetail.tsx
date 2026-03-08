/**
 * Right sidebar panel showing the full detail of a selected task.
 *
 * Organized into PanelSections with proper visual hierarchy:
 * Metadata, Helpers, Relations, Description, Questions, Issues, Log.
 */

import { useCallback, useState } from "react";
import type { Task, TaskStatus } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { PanelSection } from "@/components/common/PanelSection";
import { ChipList } from "@/components/detail/ChipList";
import { QuestionItem } from "@/components/detail/QuestionItem";
import { IssueItem } from "@/components/detail/IssueItem";
import { LogItem } from "@/components/detail/LogItem";
import { MarkdownBlock } from "@/components/common/MarkdownBlock";
import { CreateGroupDialog } from "@/components/common/CreateGroupDialog";
import { resolveDeadline, formatDateTime } from "@/lib/dates";

const STATUS_OPTIONS: TaskStatus[] = ["todo", "in_progress", "finished", "cancelled"];

interface TaskDetailProps {
  task: Task;
}

/** Sentinel value used as the "New group..." option in the group dropdown */
const NEW_GROUP_SENTINEL = "__new_group__";

export function TaskDetail({ task }: TaskDetailProps) {
  const project = useProjectStore((s) => s.project)!;
  const updateTask = useProjectStore((s) => s.updateTask);
  const deleteTask = useProjectStore((s) => s.deleteTask);
  const selectTask = useProjectStore((s) => s.selectTask);

  const [showCreateGroup, setShowCreateGroup] = useState(false);

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
    <div className="space-y-1 text-white">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between pb-2">
        <h2 className="text-xl font-bold">{task.title}</h2>
        <button onClick={() => selectTask(null)} className="text-white/70 hover:text-white" title="Close">✕</button>
      </div>

      {/* ── Metadata ─────────────────────────────────────── */}
      <PanelSection title="Metadata">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold">Deadline</label>
            <input
              value={task.deadline}
              onChange={(e) => updateField("deadline", e.target.value)}
              className="input-panel flex-1"
              placeholder="-5d or 2026-05-01"
            />
            {resolvedDate && <span className="text-xs text-white/70">{formatDateTime(resolvedDate)}</span>}
          </div>
          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold">Status</label>
            <select
              value={task.status}
              onChange={(e) => updateField("status", e.target.value as TaskStatus)}
              className="select-panel flex-1"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="text-black">{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold">Assignee</label>
            <select
              value={task.assignee}
              onChange={(e) => updateField("assignee", e.target.value)}
              className="select-panel flex-1"
            >
              <option value="" className="text-black">—</option>
              {helperIds.map((id) => (
                <option key={id} value={id} className="text-black">{id} ({project.helpers[id]!.name})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold">Group</label>
            <select
              value={task.group}
              onChange={(e) => {
                if (e.target.value === NEW_GROUP_SENTINEL) {
                  setShowCreateGroup(true);
                  return;
                }
                updateField("group", e.target.value);
              }}
              className="select-panel flex-1"
            >
              <option value={NEW_GROUP_SENTINEL} className="text-black font-medium">+ New group…</option>
              {project.groups.map((g) => (
                <option key={g.path} value={g.path} className="text-black">{g.path}</option>
              ))}
            </select>
          </div>
        </div>
      </PanelSection>

      {/* ── Helpers (merged) ──────────────────────────────── */}
      <PanelSection title="Helpers" badge={`${task.helpers.length}/${task.n_helpers_needed}`}>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <label className="font-semibold">Required:</label>
            <input
              type="number"
              min={0}
              value={task.n_helpers_needed}
              onChange={(e) => updateField("n_helpers_needed", parseInt(e.target.value, 10) || 0)}
              className="input-panel w-16"
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
      </PanelSection>

      {/* ── Relations ─────────────────────────────────────── */}
      <PanelSection title="Relations" defaultOpen={false}>
        <div className="space-y-3">
          <ChipList label="Depends On" items={task.depends_on} suggestions={taskIds} onChange={(items) => updateField("depends_on", items)} />
          <ChipList label="Tags" items={task.tags} allowCustom onChange={(items) => updateField("tags", items)} />
          <ChipList label="Ext. Entities" items={task.external_entities} suggestions={entityIds} renderLabel={(id) => project.external_entities[id]?.name ?? id} onChange={(items) => updateField("external_entities", items)} />
        </div>
      </PanelSection>

      {/* ── Description ──────────────────────────────────── */}
      <PanelSection title="Description">
        <div className="rounded bg-white p-2 text-gray-800">
          <MarkdownBlock content={task.description} onSave={(c) => updateField("description", c)} placeholder="No description" />
        </div>
      </PanelSection>

      {/* ── Questions ────────────────────────────────────── */}
      <PanelSection
        title="Questions"
        badge={unansweredQuestionCount > 0 ? `${unansweredQuestionCount} unanswered` : `${task.questions.length}`}
        defaultOpen={task.questions.length > 0}
      >
        {task.questions.map((q, i) => (
          <QuestionItem
            key={i}
            question={q}
            onUpdate={(updated) => { const qs = [...task.questions]; qs[i] = updated; updateField("questions", qs); }}
            onRemove={() => updateField("questions", task.questions.filter((_, j) => j !== i))}
          />
        ))}
        <button
          onClick={() => updateField("questions", [...task.questions, { title: "New question", recurring: false, answer: "" }])}
          className="mt-1 text-sm text-white/70 hover:text-white"
        >
          + Add question
        </button>
      </PanelSection>

      {/* ── Issues ───────────────────────────────────────── */}
      <PanelSection
        title="Issues"
        badge={unresolvedIssueCount > 0 ? `${unresolvedIssueCount} open` : `${task.issues.length}`}
        defaultOpen={task.issues.length > 0}
      >
        {task.issues.map((issue, i) => (
          <IssueItem
            key={i}
            issue={issue}
            helperIds={helperIds}
            onUpdate={(updated) => { const is = [...task.issues]; is[i] = updated; updateField("issues", is); }}
            onRemove={() => updateField("issues", task.issues.filter((_, j) => j !== i))}
          />
        ))}
        <button
          onClick={() => updateField("issues", [...task.issues, { title: "New issue", description: "", assignee: "", solution: "" }])}
          className="mt-1 text-sm text-white/70 hover:text-white"
        >
          + Add issue
        </button>
      </PanelSection>

      {/* ── Log ──────────────────────────────────────────── */}
      <PanelSection title="Log" badge={`${task.log.length}`} defaultOpen={task.log.length > 0}>
        {task.log.map((entry, i) => (
          <LogItem
            key={i}
            entry={entry}
            onUpdate={(updated) => { const l = [...task.log]; l[i] = updated; updateField("log", l); }}
            onRemove={() => updateField("log", task.log.filter((_, j) => j !== i))}
          />
        ))}
        <button
          onClick={() => {
            const d = new Date();
            const ds = `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, "0")}_${String(d.getDate()).padStart(2, "0")}`;
            updateField("log", [...task.log, { date: ds, title: "New entry", body: "" }]);
          }}
          className="mt-1 text-sm text-white/70 hover:text-white"
        >
          + Add log entry
        </button>
      </PanelSection>

      {/* ── Delete ───────────────────────────────────────── */}
      <div className="border-t border-white/20 pt-3">
        <button
          onClick={() => { if (confirm(`Delete task "${task.title}"?`)) deleteTask(task); }}
          className="btn-danger-subtle"
        >
          Delete task...
        </button>
      </div>

      {/* ── Create Group Dialog ─────────────────────────── */}
      {showCreateGroup && (
        <CreateGroupDialog
          onClose={() => setShowCreateGroup(false)}
          onCreated={(groupPath) => updateField("group", groupPath)}
        />
      )}
    </div>
  );
}
