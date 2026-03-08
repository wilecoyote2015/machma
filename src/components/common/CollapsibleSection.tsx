/**
 * A collapsible section with a toggleable header.
 * Used in the task detail panel to group related content.
 */

import { useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  /** Optional badge text shown next to the title (e.g. count) */
  badge?: string;
  /** Start expanded? Defaults to true */
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-left font-semibold text-white hover:text-white/90"
      >
        <span className="text-xs text-white/60">{open ? "▼" : "▶"}</span>
        <span>{title}</span>
        {badge && (
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-normal">
            {badge}
          </span>
        )}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </section>
  );
}
