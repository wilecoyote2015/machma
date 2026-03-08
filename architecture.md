# Machma — Architecture

## Overview

Machma is a **pure client-side SPA** (no backend, no database) built with Vite + React + TypeScript + Tailwind CSS. All data lives in plain text files (JSON + Markdown) inside a local project directory. The browser reads and writes these files directly via the **File System Access API** (Chromium only).

## Tech Stack

| Layer              | Technology               | Purpose                                        |
|--------------------|--------------------------|------------------------------------------------|
| Build              | Vite 7                   | Bundler, dev server, HMR                       |
| UI                 | React 19 + TypeScript    | Component framework                            |
| Styling            | Tailwind CSS 4           | Utility-first CSS with `@theme` semantic tokens|
| Graph/Timeline     | @xyflow/react (React Flow) 12 | Pan/zoom canvas with custom node rendering  |
| State              | Zustand 5                | Single-store state management                  |
| Markdown rendering | react-markdown 10        | Renders description/log/issue bodies           |
| File I/O           | File System Access API   | Browser-native read/write to local directory   |

## Data Flow

```
User opens directory → File System Access API
    → project-loader reads all JSON + MD files
    → parser.ts converts each .md into a Task object
    → Zustand store populated with full Project model
    → React components render from store

User edits in UI → store updated immediately
    → serializer.ts converts Task back to .md
    → writeTextFile persists to disk

File watcher (3s poll) → detects external lastModified changes
    → re-reads changed files → updates store
```

## Directory Structure

```
src/
├── main.tsx                          # ReactDOM entry point
├── App.tsx                           # Root: shows ProjectPicker or AppShell
├── types.ts                          # All TypeScript interfaces (Project, Task, Helper, etc.)
├── index.css                         # Tailwind imports, @theme color tokens, @apply utility classes
├── vite-env.d.ts                     # File System Access API type declarations
│
├── stores/
│   └── project-store.ts              # Zustand store: project, selectedTask, filters, CRUD actions
│
├── lib/
│   ├── constants.ts                  # Shared constants, task status lists, formatStatus(), sentinel values
│   ├── format.ts                     # Person display formatting (getInitials)
│   ├── fs.ts                         # File System Access API wrapper (open, read, write, list)
│   ├── parser.ts                     # State-machine MD parser (.md → Task object)
│   ├── serializer.ts                 # Inverse of parser (Task object → .md string)
│   ├── headings.ts                   # Heading level elevation/demotion for nested MD sections
│   ├── project-loader.ts             # Reads entire project directory into Project model
│   ├── watcher.ts                    # Timestamp snapshot diffing for external change detection
│   ├── filters.ts                    # Shared task filtering logic (used by timeline + table)
│   └── dates.ts                      # Date resolution, start-date refinement, formatting, snap helpers
│
├── hooks/
│   └── useFileWatcher.ts             # React hook: polls for external file changes every 3s
│
├── components/
│   ├── AppShell.tsx                  # Thin nav shell: top bar + view routing
│   │
│   ├── common/
│   │   ├── ViewLayout.tsx            # Generic 3-panel layout (filter | content | detail)
│   │   ├── SortableTable.tsx         # Generic sortable table: sort state, column definitions, row selection, day separators
│   │   ├── PanelSection.tsx          # Collapsible section with indented content for sidebars
│   │   ├── MarkdownBlock.tsx         # View/edit toggle: react-markdown ↔ textarea
│   │   ├── EditableRecordTable.tsx   # Generic inline-editable keyed table (used by Helpers/Entities)
│   │   ├── ProjectPicker.tsx         # Landing screen ("Open Project Folder" button)
│   │   ├── AddTaskDialog.tsx         # Modal: create new task (group + ID, with "New group…" option)
│   │   ├── CreateGroupDialog.tsx     # Modal: create new group (name, parent, color)
│   │   ├── HelpersView.tsx           # Thin wrapper around EditableRecordTable for helpers.json
│   │   │                            #   (manages helper people records, NOT task assignments)
│   │   └── EntitiesView.tsx          # Thin wrapper around EditableRecordTable for external_entities.json
│   │
│   ├── ui/                           # Small reusable UI primitives
│   │   ├── IssueIndicator.tsx        # Red dot (unresolved issues)
│   │   ├── QuestionIndicator.tsx     # Orange "?" circle (unanswered questions)
│   │   ├── StatusBadge.tsx           # Colored status badge + border class helper
│   │   ├── AssigneeBadge.tsx         # Colored assignee chip with optional custom color (dark/light variants)
│   │   ├── PersonBadge.tsx          # Color circle + person name label (mirrors GroupBadge for people)
│   │   ├── GroupBadge.tsx            # Color circle + group path label (used in table, filters, detail)
│   │   └── FilterToggleGroup.tsx     # Toggle button group for filter chips
│   │
│   ├── filters/
│   │   ├── FilterSections.tsx        # Shared filter building blocks: shell, deadline/group/assignee sections, toggleSet
│   │   ├── FilterPanel.tsx           # Left sidebar for Tasks/Timeline: composes shared + task-specific sections
│   │   ├── IssueFilterPanel.tsx      # Left sidebar for Issues: composes shared + issue-specific sections
│   │   └── QuestionFilterPanel.tsx   # Left sidebar for Questions: composes shared + question-specific sections
│   │
│   ├── detail/
│   │   ├── TaskDetail.tsx            # Right sidebar: full task editing via PanelSections
│   │   ├── ItemDetailShell.tsx       # Shared wrapper: header, task info section, TaskDetail toggle
│   │   ├── IssueDetail.tsx           # Issue detail panel (uses ItemDetailShell + issue-specific sections)
│   │   ├── QuestionDetail.tsx        # Question detail panel (uses ItemDetailShell + question-specific sections)
│   │   ├── ChipList.tsx              # Interactive add/remove chip list for arrays
│   │   ├── QuestionItem.tsx          # Single question entry with answer editing
│   │   ├── IssueItem.tsx             # Single issue entry with assignee + solution
│   │   └── LogItem.tsx               # Single log entry with date + body editing
│   │
│   ├── timeline/
│   │   ├── TimelineView.tsx          # React Flow canvas wrapped in ViewLayout
│   │   ├── TaskNode.tsx              # Custom node: group color, title, date, assignee, indicators
│   │   ├── TimelineTickNode.tsx      # Date label node on the vertical timeline axis
│   │   └── layout.ts                 # Smart layout: date→Y mapping, group→X columns, tick generation
│   │
│   └── table/
│       ├── TaskTableView.tsx         # Tasks table: column defs + SortableTable + ViewLayout
│       ├── IssueTableView.tsx        # Issues table: flatten + filter + SortableTable + ViewLayout
│       ├── QuestionTableView.tsx     # Questions table: flatten + filter + SortableTable + ViewLayout
│       └── HelperListView.tsx        # Helper list: per-task helper management cards + ViewLayout
```

## Key Design Decisions

### No Backend

The File System Access API (`showDirectoryPicker`, `FileSystemFileHandle`) allows the browser to read/write local files directly. No server, no database, no API routes. The app is a static SPA served from `dist/` or `npm run dev`.

### MD as Serialization, Not Display

Task `.md` files are parsed into structured `Task` objects by a state-machine parser. Each field maps to a dedicated UI widget (dropdown, chip list, number input). Only free-text sections (Description, Issue bodies, Log entries, Question answers) use react-markdown for rendering. Round-trip fidelity (parse → serialize → identical output) is critical for clean git diffs.

### Heading Elevation

User-written headings inside content sections are elevated on save (e.g. `#` → `##` in Description) to avoid collision with structural markdown markers, and demoted on load. This is transparent to the user.

### Smart Timeline Layout

**Y-axis (date mapping):** The timeline Y-axis uses a non-linear mapping: a `buildYMapper` function walks sorted task dates and enforces minimum spacing between adjacent nodes, stretching dense clusters and compressing sparse gaps. Timeline tick marks share the same mapping so dates stay aligned.

**X-axis (per-row compact packing):** The horizontal layout uses a multi-step algorithm in `layout.ts`:

1. **Group ordering by connectivity:** Groups are ordered so that groups with cross-group dependencies are placed adjacent. A greedy approach seeds with the most-connected group and iteratively appends the next most-connected group.
2. **Initial slot estimation:** Each group's peak density (maximum simultaneous tasks at any Y level) is computed. This seeds the initial horizontal slot offsets so the first row has reasonable positions without collisions.
3. **Per-row compact packing:** Each Y row is packed independently. Groups present in the row are placed left-to-right in their global order, with each group's tasks forming a contiguous block of grid slots. This eliminates the fixed-band waste where sparse rows inherited the width of dense rows.
4. **Alignment continuity:** Between rows, each group tries to stay at its previous-row slot position (within a `MAX_ALIGNMENT_GAP` tolerance of 2 empty slots). If the gap would be too large, the group compacts toward the left. This balances vertical alignment of same-group tasks with horizontal compactness.

**Dependency edge visuals:** Dependency edges are dashed lines with arrowhead markers indicating direction. Each edge is colored by the **source** (parent/blocking) task's status:
- **gray** — `todo` (default, not yet started)
- **yellow** — `in_progress` (actively being worked on, still blocking)
- **green** — `finished` (dependency satisfied)
- **red** — `cancelled` (dependency was cancelled)

Color constants live in `EDGE_COLOR` in `lib/constants.ts`.

**Interactive dependency editing:** Users can create and remove dependencies directly on the canvas:
- **Create:** Drag from a node's bottom handle (source) to another node's top handle (target). Validation prevents self-references, duplicate edges, and connections to timeline tick nodes.
- **Remove:** Select a dependency edge (click it), then press Delete or Backspace.

Both operations persist immediately to disk via `updateTask` in the Zustand store. Edges are derived from task data (`depends_on`) on every render — a local `useState` mirrors the computed edges to support React Flow's controlled-edge selection/deletion API, synced synchronously during render (not via `useEffect`) to avoid 1-frame mismatches between nodes and edges.

**Stable timeline axis across filters:** `computeLayout` receives both `filteredTasks` and `allTasks`. In normal mode, the Y-axis mapping (date→pixel), date range, and timeline tick generation are always based on **all** tasks so the timeline stays stable when filters change — the user keeps temporal orientation. Only filtered tasks are rendered as visible nodes. Tick marks span the full date range from first to last task date (with padding), and `generateTickDates` always includes a final tick at or past the max date so the axis arrow reaches the end. The `minZoom` is set low (0.05) so users can zoom out to see the entire timeline.

**Day-view mode (hourly ticks):** When the deadline date range filter covers ≤ 2 days, `computeLayout` switches to "day-view mode": the Y-axis covers only the filtered date range (not all tasks), uses a much higher pixel-per-day scale (`DAY_VIEW_PIXELS_PER_DAY = 24 * 80` ≈ 80 px/hour), and generates hourly tick marks via `generateHourlyTickDates`. Midnight ticks show the full date; other ticks show just "HH:00". This allows tasks with different time-of-day values to be visually separated vertically. The `buildYMapper` function accepts a `pixelsPerDay` parameter to support both normal and day-view scales.

**Task time-of-day:** Each task has an optional `time` field (HH:MM). When set, `resolveDeadline` applies it to the resolved date, giving tasks with different times distinct timestamps and thus distinct Y positions on the timeline — particularly visible in day-view mode.

**Start date/time refinement (rendering-only):** `resolveStartDate()` in `lib/dates.ts` applies implicit defaults at rendering time without modifying the .md files:
- If `start_time` is set but `start_date` is not → the deadline's date is used as the start date (same day). In day-view mode the start_time is applied for hourly positioning.
- If `start_date` is set but `start_time` is not → 00:00 is assumed (already the default behaviour of `resolveDeadline`).
These rules are purely for layout/display; the .md data model is unaffected, and omitting either field remains valid.

**Start date → deadline duration lines:** Each task has optional `start_date` and `start_time` fields. When a start date can be resolved (explicitly set, or implied via the refinement above), the task node is positioned at the start date's Y position instead of the deadline. A vertical line extends from the node downward to the deadline Y position, terminating in a horizontal T-bar (box-plot style). This makes the task's time span visually apparent. The duration line is rendered as an absolutely-positioned overlay within the `TaskNode` component using a `deadlineOffsetY` value computed in `layout.ts`. Both start dates and deadlines feed into the Y mapper so the axis covers the full range.

**Vertical drag-to-set-date:** Task nodes on the timeline are vertically draggable (X is locked to the layout position). Dropping a node converts its Y position back to a date via the inverse Y mapper (`yToTime` — built from the same piecewise-linear control points as the forward `timeToY`, ensuring perfect consistency). The date is snapped to the nearest **day** in normal view or to the nearest **15-minute** boundary in day-view mode. For tasks with a start date/time, dragging sets the start date/time and shifts the deadline by the same amount, preserving the task's duration. For tasks without a start date, dragging directly moves the deadline. Dragging always converts relative deadlines (e.g. `"-5d"`) to absolute dates — the user is explicitly overriding the schedule. Snap utilities (`snapToDay`, `snapTo15Min`) and `formatTime` live in `lib/dates.ts`.

**Dangling edge prevention:** `buildDependencyEdges` only creates edges when both the source and target task exist in the current (potentially filtered) task set. This prevents React Flow from receiving edges referencing non-existent nodes.

### ViewLayout Abstraction

The `ViewLayout` component encapsulates the three-panel pattern (filter sidebar | main content | detail sidebar). Each view (Timeline, Tasks, Issues, Questions) wraps itself in ViewLayout and passes its own filter and detail panels. This decouples panel management from AppShell.

### Shared Table, Filter & Detail Components (DRY)

All table views (Tasks, Issues, Questions) share a generic **`SortableTable<T>`** component that encapsulates table structure, sort state management, clickable column headers with sort indicators, row selection highlighting, and empty-state display. Each view defines its own column array with per-column render functions and optional comparators; the generic component handles all the common logic.

**Visual day separation:** `SortableTable` supports an optional `separatorGroupKeys` prop — a map from sort column keys to group-key extractors. When sorting by a mapped column (e.g. `deadline`, `start_date`), empty separator rows are automatically inserted between blocks of 2+ consecutive rows sharing the same group key (e.g. same date). Separators are not inserted before the first or after the last row, and adjacent blocks share a single separator.

All filter panels compose from shared building blocks in **`FilterSections.tsx`**:
- `FilterPanelShell` — outer wrapper with "Clear all" button and consistent styling
- `DeadlineFilterSection` — deadline date range filter with From/To date inputs and preset buttons (All, Anchor, 7d, 14d, 30d, 90d). The "Anchor" preset sets both start and end to the project's anchor date (single-day view, triggers day-view mode in the timeline). The time-based presets set start=today, end=today+N days. The anchor date is read from the project store directly.
- `GroupFilterSection` — group checkbox list (reads groups from the store)
- `AssigneeFilterSection` — helper checkbox list with parameterized title
- `toggleSet` — immutable Set toggle utility

Each filter panel (tasks, issues, questions) composes these shared sections with its own view-specific sections (e.g. task status, tags, issue/question status).

The main task/timeline filter panel has **separate** "Assignee" and "Helpers" filter sections: the assignee filter matches the task's primary assignee, while the helpers filter matches people in the task's helpers list. Both are independent conjunctive filters.

The issue and question detail panels share **`ItemDetailShell`**, which provides:
- Header with title, optional subtitle elements (status badges), and close button
- Parent task info section with clickable task name, group, deadline, and assignee
- TaskDetail toggle: clicking the task name replaces the panel with the full `TaskDetail`, with a back button to return

### Issue & Question Table Views

The Issues and Questions views flatten all issues/questions from all tasks into a single sortable table using `SortableTable`. Each row represents one issue or question, joined with its parent task's metadata (group, deadline, assignee). Filtering is applied during the flattening step for efficiency. Filter and selection state are managed locally within each view component (not in the global store), since these filters are view-specific and not shared with other views.

### Helper List View

The Helper List view (`HelperListView`) provides a task-centric view of helper assignments. It shows all tasks that require helpers (`n_helpers_needed > 0` or `helpers.length > 0`) as individual cards, sorted by deadline. Each card contains:

- **Clickable header**: group badge, task title, deadline, status badge, and a fill indicator (`assigned/required`) that turns green when fulfilled, amber when under-staffed.
- **Required helpers input**: inline-editable number field to set `n_helpers_needed`.
- **Helper table**: one row per assigned helper (ID badge + resolved name from `helpers.json`), with a remove button.
- **Add helper dropdown**: shows unassigned helpers; selecting one immediately adds it to the task.

The view reuses `ViewLayout` with the shared `FilterPanel` (global filters apply to the task list) and opens `TaskDetail` in the right panel when a task card header is clicked. All helper mutations go through `updateTask` in the Zustand store, persisting to disk immediately.

### Responsive Design

ViewLayout handles responsive breakpoints:
- **Desktop (lg+)**: side-by-side sidebars
- **Mobile (<lg)**: panels become full-screen overlays with backdrop, one at a time
- Unified UX: filter icon button opens the panel, X closes it, on both breakpoints

### Centralized Theming

All semantic colors are defined once in `index.css` via Tailwind v4 `@theme` (primary, issue, question, success, panel, etc.). Reusable CSS classes (`.btn-primary`, `.btn-secondary`, `.input-light`, `.input-panel`, `.select-panel`, `.select-table`) are defined with `@apply`. The `.select-panel` class includes `[&>option]:text-black` so `<option>` elements in dark-panel dropdowns don't need individual `text-black` overrides. Hex constants for non-CSS contexts (React Flow node data, inline styles) live in `lib/constants.ts`, including `EDGE_COLOR` — a status-keyed map of dependency edge colors.

### Assignee Display Convention

Assignee/helper person representation follows a unified convention across the app:

- **Tables** (Tasks, Issues, Questions) and **Timeline nodes**: show **initials** derived from the person's full name (e.g. "B.S" for "Björn Schmidt") via `getInitials()` in `lib/format.ts`. Timeline node badges use the helper's custom `color` from `helpers.json` (falling back to `DEFAULT_ASSIGNEE_COLOR`).
- **Detail panels** (TaskDetail, ItemDetailShell): show **"Name (Initials)"** (e.g. "Björn Schmidt (B.S)") for full clarity.
- **Helper List view**: the only place that shows the raw **helper ID** alongside the resolved name.
- **Filter panels**: show **colored dot + full name** (via `PersonBadge`), visually matching the `GroupBadge` pattern for groups. The dot color comes from the helper's `color` field.

The raw helper ID is never displayed to users outside the Helper List view. Internally, all data still stores helper IDs; the display format is resolved at render time.

### Helper Colors

Each helper in `helpers.json` has an optional `role` field (free text, e.g. "core member", "volunteer") shown only in the Helpers management table for informational purposes and quick inline editing.

### Helper Colors

Each helper in `helpers.json` has an optional `color` field (hex string). This color is used:
- In `AssigneeBadge` on timeline nodes (badge background)
- In `PersonBadge` in filter panels (colored dot)
- Falls back to `DEFAULT_ASSIGNEE_COLOR` (green-700) when empty/missing.

The color is editable via a native color picker in the Helpers view (`EditableRecordTable` supports a `fieldTypes` prop to render `<input type="color">` for specific fields).

### Centralized Date Formatting (DRY)

All date display uses a single `formatDate(date)` → `YYYY-MM-DD` function in `lib/dates.ts`. This is the canonical format across the entire application: display strings, `<input type="date">` bindings, timeline tick labels, and filter preset calculations all use `formatDate` — eliminating previously scattered inline date formatting. `formatDateTime` extends this with ` HH:MM` for non-midnight times. `formatTime` formats only the HH:MM component (used when drag-and-drop sets time fields in day-view mode). `resolveStartDate` applies rendering-time refinement for start dates (see Smart Timeline Layout above). `snapToDay` and `snapTo15Min` quantize timestamps for drag snapping.

### Centralized Constants (DRY)

`lib/constants.ts` centralizes values used across multiple files:
- `TASK_STATUSES` — canonical ordered list of all `TaskStatus` values
- `TASK_STATUS_OPTIONS` — pre-formatted `{ label, value }` pairs for `FilterToggleGroup`
- `formatStatus(status)` — converts `"in_progress"` → `"in progress"` (replaces scattered `.replace("_", " ")` calls)
- `NEW_GROUP_SENTINEL` — sentinel for "New group…" dropdown option (used by TaskDetail + AddTaskDialog)
- Color constants: `DEFAULT_GROUP_COLOR`, `DEFAULT_ASSIGNEE_COLOR`, `AXIS_COLOR`, `EDGE_COLOR`

### Inline Table Editing

The Tasks table view provides direct inline editing for both the **assignee** and **status** fields. Both columns render native `<select>` dropdowns (with click propagation stopped to avoid triggering row selection). Assignee options show initials; status options use `TASK_STATUSES` from `constants.ts`. Both use the shared `.select-table` CSS class plus a dynamic `statusBorderClass` for status-colored borders. All changes persist immediately via `updateTask`.

### Shared UI Primitives

`IssueIndicator`, `QuestionIndicator`, `StatusBadge`, `AssigneeBadge`, `PersonBadge`, `GroupBadge`, and `FilterToggleGroup` are small, single-purpose components in `components/ui/` that replace previously duplicated markup across 3-4 files each. `GroupBadge` renders a colored circle indicator alongside the group path string (e.g. "pferd/feeding"); `PersonBadge` mirrors this pattern for people (colored dot + name). Both are used consistently in filter panels for visual uniformity between groups and people.

### External Change Detection

A polling hook (`useFileWatcher`) builds a `lastModified` timestamp snapshot every 3 seconds. If any file changed externally, the full project is reloaded. This is lightweight and handles the case where files are edited in a text editor or git operations occur.

## State Management

A single Zustand store (`project-store.ts`) holds:
- `dirHandle`: the open directory handle
- `project`: the full parsed Project model (tasks, groups, helpers, entities)
- `selectedTaskId`: currently selected task
- `activeView`: which tab is shown (timeline, table, issues, questions, helperlist, helpers, entities)
- `filters`: all filter state (tags, groups, helpers, assignees, statuses, flags, deadline date range)
- Actions: `openProject`, `reloadProject`, `updateTask`, `addTask`, `deleteTask`, `createGroup`, filter toggles (including separate `toggleAssigneeFilter` and `toggleHelperFilter`, `setDeadlineStart`, `setDeadlineEnd`), `saveHelpers`, `saveExternalEntities`

### Group Management

Groups correspond to subdirectories under `tasks/`. Each group has an optional `group.json` for color and description. Groups can be nested (e.g. `pferd/feeding`).

- **Editing**: The group field in TaskDetail is a dropdown selector. Changing group moves the task file to the new group directory (old file deleted, new file written).
- **Creation**: A "New group…" option in group dropdowns (TaskDetail, AddTaskDialog) opens `CreateGroupDialog`, which creates the directory and `group.json`. The user picks a name, optional parent group, and display color.
- **Rendering**: `GroupBadge` is the DRY component for displaying groups everywhere — a colored circle plus the full group path.

## Running

```bash
npm install
npm run dev      # Vite dev server at localhost:5173
npm run build    # Production build to dist/
```

Open in Chrome/Edge. Click "Open Project Folder" and select a directory containing `project.json`.
