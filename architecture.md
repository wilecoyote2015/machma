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
│   │   ├── PanelSection.tsx          # Collapsible section with indented content for sidebars
│   │   ├── MarkdownBlock.tsx         # View/edit toggle: react-markdown ↔ textarea
│   │   ├── EditableRecordTable.tsx   # Generic inline-editable keyed table (used by Helpers/Entities)
│   │   ├── ProjectPicker.tsx         # Landing screen ("Open Project Folder" button)
│   │   ├── AddTaskDialog.tsx         # Modal: create new task (group + ID)
│   │   ├── HelpersView.tsx           # Thin wrapper around EditableRecordTable for helpers.json
│   │   └── EntitiesView.tsx          # Thin wrapper around EditableRecordTable for external_entities.json
│   │
│   ├── ui/                           # Small reusable UI primitives
│   │   ├── IssueIndicator.tsx        # Red dot (unresolved issues)
│   │   ├── QuestionIndicator.tsx     # Orange "?" circle (unanswered questions)
│   │   ├── StatusBadge.tsx           # Colored status badge + border class helper
│   │   ├── AssigneeBadge.tsx         # Green assignee chip (dark/light variants)
│   │   └── FilterToggleGroup.tsx     # Toggle button group for filter chips
│   │
│   ├── filters/
│   │   └── FilterPanel.tsx           # Left sidebar: deadline, flags, status, tags, groups, helpers
│   │
│   ├── detail/
│   │   ├── TaskDetail.tsx            # Right sidebar: full task editing via PanelSections
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
│       └── TaskTableView.tsx         # Sortable task table wrapped in ViewLayout
```

## Key Design Decisions

### No Backend

The File System Access API (`showDirectoryPicker`, `FileSystemFileHandle`) allows the browser to read/write local files directly. No server, no database, no API routes. The app is a static SPA served from `dist/` or `npm run dev`.

### MD as Serialization, Not Display

Task `.md` files are parsed into structured `Task` objects by a state-machine parser. Each field maps to a dedicated UI widget (dropdown, chip list, number input). Only free-text sections (Description, Issue bodies, Log entries, Question answers) use react-markdown for rendering. Round-trip fidelity (parse → serialize → identical output) is critical for clean git diffs.

### Heading Elevation

User-written headings inside content sections are elevated on save (e.g. `#` → `##` in Description) to avoid collision with structural markdown markers, and demoted on load. This is transparent to the user.

### Smart Timeline Scaling

The timeline Y-axis uses a non-linear mapping: a `buildYMapper` function walks sorted task dates and enforces minimum spacing between adjacent nodes, stretching dense clusters and compressing sparse gaps. Timeline tick marks share the same mapping so dates stay aligned.

### ViewLayout Abstraction

The `ViewLayout` component encapsulates the three-panel pattern (filter sidebar | main content | detail sidebar). Each view (Timeline, Table, future Issue/Question tables) wraps itself in ViewLayout and passes its own filter and detail panels. This decouples panel management from AppShell.

### Responsive Design

ViewLayout handles responsive breakpoints:
- **Desktop (lg+)**: side-by-side sidebars
- **Mobile (<lg)**: panels become full-screen overlays with backdrop, one at a time
- Unified UX: filter icon button opens the panel, X closes it, on both breakpoints

### Centralized Theming

All semantic colors are defined once in `index.css` via Tailwind v4 `@theme` (primary, issue, question, success, panel, etc.). Reusable CSS classes (`.btn-primary`, `.btn-secondary`, `.input-light`, `.input-panel`, `.select-panel`) are defined with `@apply`. Hex constants for non-CSS contexts (React Flow node data, inline styles) live in `lib/constants.ts`.

### Shared UI Primitives

`IssueIndicator`, `QuestionIndicator`, `StatusBadge`, `AssigneeBadge`, and `FilterToggleGroup` are small, single-purpose components in `components/ui/` that replace previously duplicated markup across 3-4 files each.

### External Change Detection

A polling hook (`useFileWatcher`) builds a `lastModified` timestamp snapshot every 3 seconds. If any file changed externally, the full project is reloaded. This is lightweight and handles the case where files are edited in a text editor or git operations occur.

## State Management

A single Zustand store (`project-store.ts`) holds:
- `dirHandle`: the open directory handle
- `project`: the full parsed Project model (tasks, groups, helpers, entities)
- `selectedTaskId`: currently selected task
- `activeView`: which tab is shown (timeline, table, helpers, entities)
- `filters`: all filter state (tags, groups, helpers, statuses, flags, deadline proximity)
- Actions: `openProject`, `reloadProject`, `updateTask`, `addTask`, `deleteTask`, filter toggles, `saveHelpers`, `saveExternalEntities`

## Running

```bash
npm install
npm run dev      # Vite dev server at localhost:5173
npm run build    # Production build to dist/
```

Open in Chrome/Edge. Click "Open Project Folder" and select a directory containing `project.json`.
