/**
 * Interactive chip list for managing string arrays (tags, helpers, dependencies).
 * Designed for use on the dark panel background.
 */

import { useState } from "react";

interface ChipListProps {
  label: string;
  items: string[];
  suggestions?: string[];
  allowCustom?: boolean;
  renderLabel?: (id: string) => string;
  onChange: (items: string[]) => void;
}

export function ChipList({
  label,
  items,
  suggestions,
  allowCustom = false,
  renderLabel,
  onChange,
}: ChipListProps) {
  const [adding, setAdding] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const availableSuggestions = suggestions?.filter((s) => !items.includes(s)) ?? [];

  const handleAdd = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setInputValue("");
    setAdding(false);
  };

  const handleRemove = (item: string) => {
    onChange(items.filter((i) => i !== item));
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{label}</span>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs text-white/70 hover:text-white"
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-xs text-white"
          >
            {renderLabel ? renderLabel(item) : item}
            <button onClick={() => handleRemove(item)} className="text-white/50 hover:text-issue">
              ✕
            </button>
          </span>
        ))}
        {items.length === 0 && !adding && (
          <span className="text-xs italic text-white/40">None</span>
        )}
      </div>

      {adding && (
        <div className="mt-1">
          {allowCustom || availableSuggestions.length === 0 ? (
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd(inputValue);
                if (e.key === "Escape") setAdding(false);
              }}
              className="input-panel w-full text-xs"
              placeholder="Type and press Enter..."
              autoFocus
            />
          ) : (
            <select
              onChange={(e) => { if (e.target.value) handleAdd(e.target.value); }}
              className="select-panel w-full text-xs"
              autoFocus
            >
              <option value="">Select...</option>
              {availableSuggestions.map((s) => (
                <option key={s} value={s}>
                  {renderLabel ? renderLabel(s) : s}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
