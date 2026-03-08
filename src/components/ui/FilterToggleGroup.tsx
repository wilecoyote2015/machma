/**
 * A group of toggle buttons for filter selections.
 * Renders chips that toggle between active (white/primary) and inactive (muted).
 */

interface FilterToggleGroupProps<T extends string | number | null> {
  options: { label: string; value: T }[];
  selected: T | Set<T>;
  onToggle: (value: T) => void;
}

export function FilterToggleGroup<T extends string | number | null>({
  options,
  selected,
  onToggle,
}: FilterToggleGroupProps<T>) {
  const isActive = (value: T) =>
    selected instanceof Set ? selected.has(value) : selected === value;

  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const active = isActive(opt.value);
        return (
          <button
            key={String(opt.value)}
            onClick={() => onToggle(opt.value)}
            className={`rounded px-2 py-0.5 text-xs font-medium transition ${
              active
                ? "bg-white text-primary"
                : "bg-primary-muted text-white hover:bg-primary-light"
            }`}
          >
            {active && "✓ "}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
