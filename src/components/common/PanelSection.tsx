/**
 * A collapsible section for sidebar detail panels.
 *
 * Visual hierarchy: the header sits flush with the panel edge
 * with a subtle background, while the content area is indented
 * so sections are clearly distinguishable at a glance.
 */

import { useState, type ReactNode } from "react";

interface PanelSectionProps {
  title: string;
  /** Optional badge text (e.g. count) */
  badge?: string;
  /** Start expanded? Defaults to true */
  defaultOpen?: boolean;
  children: ReactNode;
}

export function PanelSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: PanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="-mx-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 bg-white/10 px-4 py-1.5 text-left text-sm font-semibold text-white transition hover:bg-white/15"
      >
        <span className="text-[10px] text-white/50">{open ? "▼" : "▶"}</span>
        <span className="flex-1">{title}</span>
        {badge && (
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-normal">
            {badge}
          </span>
        )}
      </button>
      {open && <div className="px-4 pt-2 pb-1 pl-7">{children}</div>}
    </section>
  );
}
