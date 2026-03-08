/**
 * Generic sortable table component used by all table views.
 *
 * Handles table structure, sort state management with clickable
 * column headers, row selection highlighting, and empty-state display.
 * Each view defines its own column set with per-column render functions
 * and optional comparators for sorting.
 */

import { Fragment, useMemo, useState, type ReactNode } from "react";

type SortDir = "asc" | "desc";

/** Definition of a single table column */
export interface Column<T> {
  /** Unique key for this column (used for sort state and React key) */
  key: string;
  /** Display label in the header */
  label: string;
  /** Tailwind class(es) on the <th> element, typically for width (e.g. "w-44") */
  thClassName?: string;
  /** Tailwind class(es) on the <td> element (defaults to "px-2 py-2") */
  cellClassName?: string;
  /** If provided, column is sortable — returns negative/zero/positive like Array.sort */
  compare?: (a: T, b: T) => number;
  /** Render the cell content for a given row */
  render: (row: T) => ReactNode;
}

interface SortableTableProps<T> {
  /** Column definitions (order = display order) */
  columns: Column<T>[];
  /** Row data (pre-filtered; sorting is handled internally) */
  data: T[];
  /** Extract a unique key string for each row */
  rowKey: (row: T) => string;
  /** Which column key to sort by initially (must match a column with `compare`) */
  defaultSortKey?: string;
  /** Initial sort direction (defaults to "asc") */
  defaultSortDir?: SortDir;
  /** Key of the currently selected row, or null */
  selectedRowKey?: string | null;
  /** Called when a row is clicked; receives the row data */
  onRowClick?: (row: T) => void;
  /** Message shown when data array is empty */
  emptyMessage?: string;
  /**
   * Optional: maps sort column keys to group-key extractors for visual block separation.
   * When sorting by a key in this map, empty separator rows are inserted between
   * blocks of 2+ consecutive rows sharing the same group key.
   * e.g. { deadline: (r) => dateStr, start_date: (r) => startDateStr }
   */
  separatorGroupKeys?: Record<string, (row: T) => string | null>;
}

/**
 * Compute indices where an empty separator row should be inserted.
 *
 * Rule: when 2+ consecutive rows share the same group key, insert a
 * separator before and after the block — unless it's the first/last row
 * or there's already a separator from an adjacent block.
 */
function computeSeparatorIndices<T>(
  rows: T[],
  getKey: (row: T) => string | null,
): Set<number> {
  const n = rows.length;
  if (n === 0) return new Set();

  // Identify contiguous blocks of same-key rows
  const blocks: { start: number; end: number }[] = [];
  let blockStart = 0;

  for (let i = 1; i <= n; i++) {
    const prevKey = getKey(rows[i - 1]!);
    const currKey = i < n ? getKey(rows[i]!) : null;
    if (i === n || currKey !== prevKey) {
      const blockLen = i - blockStart;
      if (blockLen >= 2 && prevKey !== null) {
        blocks.push({ start: blockStart, end: i - 1 });
      }
      blockStart = i;
    }
  }

  // Convert block boundaries to separator positions (insert BEFORE index)
  const separators = new Set<number>();
  for (const { start, end } of blocks) {
    if (start > 0) separators.add(start);
    if (end < n - 1) separators.add(end + 1);
  }
  return separators;
}

export function SortableTable<T>({
  columns,
  data,
  rowKey,
  defaultSortKey,
  defaultSortDir = "asc",
  selectedRowKey = null,
  onRowClick,
  emptyMessage = "No items match the current filters",
  separatorGroupKeys,
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState(defaultSortKey ?? "");
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  /** Find the active comparator from the column definitions */
  const activeCompare = columns.find((c) => c.key === sortKey)?.compare;

  const sortedData = useMemo(() => {
    if (!activeCompare) return data;
    const sorted = [...data].sort(activeCompare);
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [data, activeCompare, sortDir]);

  /** Separator row indices — only when sorting by a separator-eligible column */
  const separators = useMemo(() => {
    const groupKeyFn = separatorGroupKeys?.[sortKey];
    if (!groupKeyFn) return new Set<number>();
    return computeSeparatorIndices(sortedData, groupKeyFn);
  }, [sortedData, separatorGroupKeys, sortKey]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="h-full overflow-auto p-4">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200">
            {columns.map((col) => {
              const sortable = !!col.compare;
              return (
                <th
                  key={col.key}
                  onClick={sortable ? () => handleSort(col.key) : undefined}
                  className={`px-2 py-2 font-semibold text-gray-600 ${
                    sortable ? "cursor-pointer hover:text-gray-800" : ""
                  } ${col.thClassName ?? ""}`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => {
            const key = rowKey(row);
            const isSelected = key === selectedRowKey;
            return (
              <Fragment key={key}>
                {separators.has(idx) && (
                  <tr className="h-5" aria-hidden="true">
                    <td colSpan={columns.length} />
                  </tr>
                )}
                <tr
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-gray-100 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  } ${isSelected ? "bg-primary-subtle" : "hover:bg-gray-50"}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.cellClassName ?? "px-2 py-0"}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {sortedData.length === 0 && (
        <p className="mt-8 text-center text-gray-400">{emptyMessage}</p>
      )}
    </div>
  );
}
