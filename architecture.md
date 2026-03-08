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
│   ├── constants.ts                  # Shared constants (DEFAULT_GROUP_COLOR, AXIS_COLOR)
│   ├── fs.ts                         # File System Access API wrapper (open, read, write, list)
│   ├── parser.ts                     # State-machine MD parser (.md → Task object)
│   ├── serializer.ts                 # Inverse of parser (Task object → .md string)
│   ├── headings.ts                   # Heading level elevation/demotion for nested MD sections
│   ├── project-loader.ts             # Reads entire project directory into Project model
│   ├── watcher.ts                    # Timestamp snapshot diffing for external change detection
│   ├── filters.ts                    # Shared task filtering logic (used by timeline + table)
│   └── dates.ts                      # Deadline resolution (relative/absolute) and formatting
│
├── hooks/
│   └── useFileWatcher.ts             # React hook: polls for external file changes every 3s
│
├── components/
│   ├── AppShell.tsx                  # Thin nav shell: top bar + view routing
│   │
│   ├── common/
│   │   ├── ViewLayout.tsx            # Generic 3-panel layout (filter | content | detail)
│   │   ├── SortableTable.tsx         # Generic sortable table: sort state, column definitions, row selection
│   │   ├── PanelSection.tsx          # Collapsible section with indented content for sidebars
│   │   ├── MarkdownBlock.tsx         # View/edit toggle: react-markdown ↔ textarea
│   │   ├── EditableRecordTable.tsx   # Generic inline-editable keyed table (used by Helpers/Entities)
│   │   ├── ProjectPicker.tsx         # Landing screen ("Open Project Folder" button)
│   │   ├── AddTaskDialog.tsx         # Modal: create new task (group + ID, with "New group…" option)
│   │   ├── CreateGroupDialog.tsx     # Modal: create new group (name, parent, color)
│   │   ├── HelpersView.tsx           # Thin wrapper around EditableRecordTable for helpers.json
│   │   └── EntitiesView.tsx          # Thin wrapper around EditableRecordTable for external_entities.json
│   │
│   ├── ui/                           # Small reusable UI primitives
│   │   ├── IssueIndicator.tsx        # Red dot (unresolved issues)
│   │   ├── QuestionIndicator.tsx     # Orange "?" circle (unanswered questions)
│   │   ├── StatusBadge.tsx           # Colored status badge + border class helper
│   │   ├── AssigneeBadge.tsx         # Green assignee chip (dark/light variants)
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
│       └── QuestionTableView.tsx     # Questions table: flatten + filter + SortableTable + ViewLayout
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

**X-axis (intelligent group lanes):** The horizontal layout uses a multi-step algorithm in `layout.ts`:

1. **Group ordering by connectivity:** Groups are ordered so that groups with cross-group dependencies are placed adjacent. A greedy approach seeds with the most-connected group and iteratively appends the next most-connected group.
2. **Per-group sub-lane assignment:** Within each group, a greedy interval-scheduling algorithm assigns tasks to sub-lanes. Tasks are processed top-to-bottom (by Y position); each is placed in the first lane where it doesn't vertically collide with an existing task (collision detection uses an estimated `NODE_HEIGHT`).
3. **Dependency-aware lane preference:** When a task depends on another task in the same group, it prefers the dependency's sub-lane for vertical alignment of related chains.
4. **Dynamic band widths:** Each group's horizontal band width adapts to the number of sub-lanes it needs (`numLanes * NODE_WIDTH + gaps`). Groups are spaced with a fixed gap between bands.

**Dependency edge visuals:** Dependency edges are dashed lines with arrowhead markers indicating direction. Each edge is colored by the **source** (parent/blocking) task's status:
- **gray** — `todo` (default, not yet started)
- **yellow** — `in_progress` (actively being worked on, still blocking)
- **green** — `finished` (dependency satisfied)
- **red** — `cancelled` (dependency was cancelled)

Color constants live in `EDGE_COLOR` in `lib/constants.ts`.

**Interactive dependency editing:** Users can create and remove dependencies directly on the canvas:
- **Create:** Drag from a node's bottom handle (source) to another node's top handle (target). Validation prevents self-references, duplicate edges, and connections to timeline tick nodes.
- **Remove:** Select a dependency edge (click it), then press Delete or Backspace.

Both operations persist immediately to disk via `updateTask` in the Zustand store. Edges are derived from task data (`depends_on`) on every render — a local `useState` mirrors the computed edges to support React Flow's controlled-edge selection/deletion API, synced via `useEffect`.

### ViewLayout Abstraction

The `ViewLayout` component encapsulates the three-panel pattern (filter sidebar | main content | detail sidebar). Each view (Timeline, Tasks, Issues, Questions) wraps itself in ViewLayout and passes its own filter and detail panels. This decouples panel management from AppShell.

### Shared Table, Filter & Detail Components (DRY)

All table views (Tasks, Issues, Questions) share a generic **`SortableTable<T>`** component that encapsulates table structure, sort state management, clickable column headers with sort indicators, row selection highlighting, and empty-state display. Each view defines its own column array with per-column render functions and optional comparators; the generic component handles all the common logic.

All filter panels compose from shared building blocks in **`FilterSections.tsx`**:
- `FilterPanelShell` — outer wrapper with "Clear all" button and consistent styling
- `DeadlineFilterSection` — deadline proximity quick-select buttons
- `GroupFilterSection` — group checkbox list (reads groups from the store)
- `AssigneeFilterSection` — helper checkbox list with parameterized title
- `toggleSet` — immutable Set toggle utility

Each filter panel (tasks, issues, questions) composes these shared sections with its own view-specific sections (e.g. task status, tags, issue/question status).

The issue and question detail panels share **`ItemDetailShell`**, which provides:
- Header with title, optional subtitle elements (status badges), and close button
- Parent task info section with clickable task name, group, deadline, and assignee
- TaskDetail toggle: clicking the task name replaces the panel with the full `TaskDetail`, with a back button to return

### Issue & Question Table Views

The Issues and Questions views flatten all issues/questions from all tasks into a single sortable table using `SortableTable`. Each row represents one issue or question, joined with its parent task's metadata (group, deadline, assignee). Filtering is applied during the flattening step for efficiency. Filter and selection state are managed locally within each view component (not in the global store), since these filters are view-specific and not shared with other views.

### Responsive Design

ViewLayout handles responsive breakpoints:
- **Desktop (lg+)**: side-by-side sidebars
- **Mobile (<lg)**: panels become full-screen overlays with backdrop, one at a time
- Unified UX: filter icon button opens the panel, X closes it, on both breakpoints

### Centralized Theming

All semantic colors are defined once in `index.css` via Tailwind v4 `@theme` (primary, issue, question, success, panel, etc.). Reusable CSS classes (`.btn-primary`, `.btn-secondary`, `.input-light`, `.input-panel`, `.select-panel`) are defined with `@apply`. Hex constants for non-CSS contexts (React Flow node data, inline styles) live in `lib/constants.ts`, including `EDGE_COLOR` — a status-keyed map of dependency edge colors.

### Shared UI Primitives

`IssueIndicator`, `QuestionIndicator`, `StatusBadge`, `AssigneeBadge`, `GroupBadge`, and `FilterToggleGroup` are small, single-purpose components in `components/ui/` that replace previously duplicated markup across 3-4 files each. `GroupBadge` renders a colored circle indicator alongside the group path string (e.g. "pferd/feeding") and is used consistently in the task table, filter panel, and anywhere groups are displayed.

### External Change Detection

A polling hook (`useFileWatcher`) builds a `lastModified` timestamp snapshot every 3 seconds. If any file changed externally, the full project is reloaded. This is lightweight and handles the case where files are edited in a text editor or git operations occur.

## State Management

A single Zustand store (`project-store.ts`) holds:
- `dirHandle`: the open directory handle
- `project`: the full parsed Project model (tasks, groups, helpers, entities)
- `selectedTaskId`: currently selected task
- `activeView`: which tab is shown (timeline, table, issues, questions, helpers, entities)
- `filters`: all filter state (tags, groups, helpers, statuses, flags, deadline proximity)
- Actions: `openProject`, `reloadProject`, `updateTask`, `addTask`, `deleteTask`, `createGroup`, filter toggles, `saveHelpers`, `saveExternalEntities`

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
