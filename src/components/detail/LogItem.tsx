/**
 * A single log entry in the task detail panel.
 */

import type { TaskLogEntry } from "@/types";
import { MarkdownBlock } from "@/components/common/MarkdownBlock";

interface LogItemProps {
  entry: TaskLogEntry;
  onUpdate: (e: TaskLogEntry) => void;
  onRemove: () => void;
}

export function LogItem({ entry, onUpdate, onRemove }: LogItemProps) {
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
        <button onClick={onRemove} className="text-xs text-white/50 hover:text-issue">✕</button>
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
