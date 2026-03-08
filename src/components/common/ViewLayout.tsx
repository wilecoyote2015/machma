/**
 * Generic three-panel layout used by any view that needs
 * a left filter sidebar and/or a right detail panel.
 *
 * Unified open/close UX across breakpoints:
 * - Filter icon button opens the panel (top-left on desktop, bottom-left on mobile)
 * - X button inside the panel header closes it
 * - On mobile, panels are full-screen overlays with a backdrop
 * - On desktop, panels are side-by-side sidebars
 */

import { useState, useEffect, type ReactNode } from "react";

interface ViewLayoutProps {
  /** Left filter panel content (null = no filter panel for this view) */
  filterPanel: ReactNode | null;
  /** Right detail panel content (null = nothing selected) */
  detailPanel: ReactNode | null;
  /** Main content area */
  children: ReactNode;
}

/** Filter funnel SVG icon reused in the toggle button */
function FilterIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

export function ViewLayout({ filterPanel, detailPanel, children }: ViewLayoutProps) {
  const [filterOpen, setFilterOpen] = useState(true);
  const [detailMobileOpen, setDetailMobileOpen] = useState(false);

  // Auto-open detail overlay on mobile when a detail panel appears
  useEffect(() => {
    if (detailPanel) setDetailMobileOpen(true);
  }, [detailPanel]);

  const anyMobileOverlay = (filterOpen || detailMobileOpen) && filterPanel !== null;

  return (
    <div className="relative flex min-h-0 flex-1">
      {/* ── Mobile backdrop (shown when any overlay is open) ── */}
      {anyMobileOverlay && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => { setFilterOpen(false); setDetailMobileOpen(false); }}
        />
      )}

      {/* ── Left filter panel ────────────────────────────── */}
      {filterPanel && (
        <>
          {/* Filter open button — shown when panel is closed */}
          {!filterOpen && (
            <>
              {/* Desktop: top-left, inside the content area */}
              <button
                onClick={() => setFilterOpen(true)}
                className="absolute left-3 top-3 z-10 hidden h-9 w-9 items-center justify-center rounded-lg bg-panel text-white shadow-md transition hover:bg-primary-hover lg:flex"
                title="Open filters"
              >
                <FilterIcon className="h-4 w-4" />
              </button>
              {/* Mobile: bottom-left floating */}
              <button
                onClick={() => setFilterOpen(true)}
                className="fixed bottom-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-panel text-white shadow-lg lg:hidden"
                title="Open filters"
              >
                <FilterIcon />
              </button>
            </>
          )}

          {/* Desktop sidebar */}
          {filterOpen && (
            <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-panel p-4 lg:block">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-lg font-bold text-white">Filter</span>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="text-white/70 hover:text-white"
                  title="Close filters"
                >
                  ✕
                </button>
              </div>
              {filterPanel}
            </aside>
          )}

          {/* Mobile full-screen overlay */}
          {filterOpen && (
            <aside className="fixed inset-0 z-40 overflow-y-auto bg-panel p-4 lg:hidden">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-lg font-bold text-white">Filter</span>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>
              {filterPanel}
            </aside>
          )}
        </>
      )}

      {/* ── Main content ─────────────────────────────────── */}
      <main className="min-w-0 flex-1">{children}</main>

      {/* ── Right detail panel ───────────────────────────── */}
      {detailPanel && (
        <>
          {/* Desktop sidebar */}
          <aside className="hidden w-96 shrink-0 overflow-y-auto border-l border-gray-200 bg-panel p-4 lg:block">
            {detailPanel}
          </aside>

          {/* Mobile full-screen overlay */}
          {detailMobileOpen && (
            <aside className="fixed inset-0 z-40 overflow-y-auto bg-panel p-4 lg:hidden">
              <div className="mb-3 flex justify-end">
                <button
                  onClick={() => setDetailMobileOpen(false)}
                  className="text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>
              {detailPanel}
            </aside>
          )}
        </>
      )}
    </div>
  );
}
