/**
 * A markdown content block with view/edit toggle.
 * View mode: rendered markdown. Edit mode: textarea with Save/Abort.
 */

import { useState } from "react";
import Markdown from "react-markdown";

interface MarkdownBlockProps {
  content: string;
  onSave: (content: string) => void;
  placeholder?: string;
}

export function MarkdownBlock({ content, onSave, placeholder = "No content" }: MarkdownBlockProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  const handleEdit = () => {
    setDraft(content);
    setEditing(true);
  };

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleAbort = () => {
    setDraft(content);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="input-light w-full font-mono"
          rows={8}
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={handleSave} className="btn-primary">Save</button>
          <button onClick={handleAbort} className="btn-secondary">Abort</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleEdit}
      className="cursor-pointer rounded border border-transparent p-0 hover:border-gray-200 hover:bg-gray-50"
      title="Click to edit"
    >
      {content.trim() ? (
        <div className="prose prose-sm max-w-none">
          <Markdown>{content}</Markdown>
        </div>
      ) : (
        <p className="text-sm italic text-gray-400">{placeholder}</p>
      )}
    </div>
  );
}
