/**
 * A markdown content block with view/edit toggle.
 *
 * - View mode: rendered markdown via react-markdown
 * - Edit mode: plain textarea with Save/Abort buttons
 */

import { useState } from "react";
import Markdown from "react-markdown";

interface MarkdownBlockProps {
  /** The raw markdown string */
  content: string;
  /** Called with the new content when the user saves */
  onSave: (content: string) => void;
  /** Optional placeholder when content is empty */
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
          className="w-full rounded border border-gray-300 p-2 font-mono text-sm focus:border-orange-400 focus:outline-none"
          rows={8}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="rounded bg-orange-500 px-3 py-1 text-sm text-white hover:bg-orange-600"
          >
            Save
          </button>
          <button
            onClick={handleAbort}
            className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
          >
            Abort
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleEdit}
      className="cursor-pointer rounded border border-transparent p-2 hover:border-gray-200 hover:bg-gray-50"
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
