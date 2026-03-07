/**
 * An interactive chip list for managing string arrays (tags, helpers, dependencies, etc.).
 * Supports adding from suggestions or custom text, and removing individual items.
 */

import { useState } from "react";

interface ChipListProps {
  label: string;
  items: string[];
  /** Available items to choose from when adding */
  suggestions?: string[];
  /** Allow typing custom values (not just from suggestions) */
  allowCustom?: boolean;
  /** Custom display label for an item ID */
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

      {/* Chips */}
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-xs text-white"
          >
            {renderLabel ? renderLabel(item) : item}
            <button
              onClick={() => handleRemove(item)}
              className="text-white/50 hover:text-red-300"
            >
              ✕
            </button>
          </span>
        ))}
        {items.length === 0 && !adding && (
          <span className="text-xs italic text-white/40">None</span>
        )}
      </div>

      {/* Add input */}
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
              className="w-full rounded border border-white/30 bg-white/10 px-2 py-1 text-xs text-white placeholder-white/50 focus:border-white focus:outline-none"
              placeholder="Type and press Enter..."
              autoFocus
            />
          ) : (
            <select
              onChange={(e) => {
                if (e.target.value) handleAdd(e.target.value);
              }}
              className="w-full rounded border border-white/30 bg-white/10 px-2 py-1 text-xs text-white focus:border-white focus:outline-none"
              autoFocus
            >
              <option value="" className="text-black">Select...</option>
              {availableSuggestions.map((s) => (
                <option key={s} value={s} className="text-black">
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
