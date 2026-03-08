# Machma

Machma is a lean, text-based task management tool for events and projects. It runs entirely in the browser with no backend — all data lives in plain Markdown and JSON files on your local filesystem.

## Key Features

- **Text-file based**: All project data is stored as `.md` and `.json` files. Edit them with any text editor, version-control with git, and use Machma's UI for visual management.
- **Timeline view**: Interactive graph showing tasks as colored nodes on a vertical timeline, with dependency arrows, pan/zoom, and smart density-aware spacing.
- **Tasks view**: Sortable task table with columns for title, group, deadline, assignee, helpers, status, issues, questions, and a truncated description preview.
- **Rich filtering**: Filter by deadline proximity, status, tags, groups, helpers, unresolved issues, and unanswered questions.
- **Task detail editing**: Click any task to open a side panel with metadata fields, markdown description, questions, issues, and log entries — all editable inline.
- **Live sync**: Polls for external file changes every 3 seconds, so edits made in a text editor or via git are reflected automatically.
- **No backend**: Pure client-side SPA using the File System Access API. No server, no database, no Docker.
- **Responsive**: Desktop three-panel layout with collapsible sidebars; mobile full-screen overlay panels.

## Getting Started

```bash
npm install
npm run dev
```

Open **Chrome** or **Edge** (Chromium required for File System Access API) and navigate to `http://localhost:5173`.

Click **"Open Project Folder"** and select a directory containing a `project.json` file (see [example_project/](example_project/) for a working example).

For production use, build and serve statically:

```bash
npm run build
npx serve dist
```

## UI Overview

![UI Mockup](docs/main.png)

The app has seven views, accessible via the top navigation bar:

### Timeline
A React Flow canvas showing tasks as nodes positioned on a vertical date axis. Each node is colored by its group, shows the task title, resolved deadline, assignee initials, and indicators for unresolved issues (red dot) and unanswered questions (orange "?"). Dependency arrows connect tasks — colored by the parent task's status (yellow = in progress, green = finished, red = cancelled, gray = todo) so you can instantly see which blockers are resolved. A left filter panel and right detail panel can be opened/closed. Groups are ordered horizontally by dependency connectivity (connected groups are placed adjacent), and tasks within the same group automatically spread into sub-lanes when they share similar deadlines, preventing overlap while keeping related dependency chains vertically aligned.

**Interactive dependency editing**: Drag from a node's bottom handle to another node's top handle to create a dependency. Select a dependency edge and press Delete/Backspace to remove it. Connection validation prevents self-references and duplicates.

### Tasks
A sortable table of all tasks. Click column headers to sort. Columns: title, group (color dot), deadline, assignee, helpers (assigned/needed), status (badge), issues, questions, and a truncated description preview. Click a row to open the task detail panel.

### Issues
A flat sortable table of all issues across all tasks. Each row represents one issue, with columns: name, task (parent), group, deadline, task assignee, issue assignee, status (resolved/unresolved), and task description. The filter panel can filter by issue status (resolved/unresolved/both), issue assignee, task assignee, task group, and task deadline proximity. Clicking a row opens the issue detail panel (not the full task). From the issue detail panel, clicking the task name opens the full task detail in-place with a back button to return.

### Questions
A flat sortable table of all questions across all tasks. Each row represents one question, with columns: name, task (parent), group, deadline, task assignee, status (answered/unanswered), answer (truncated), and task description. The filter panel can filter by question status (answered/unanswered/both), task assignee, task group, and task deadline proximity. Clicking a row opens the question detail panel (not the full task). From the question detail panel, clicking the task name opens the full task detail in-place with a back button to return.

### Helper List
A task-centric view for managing helper assignments. Shows all tasks that require helpers as individual cards, sorted by deadline. Each card displays the task header (group, title, deadline, status, and a green/amber fill indicator showing assigned vs. required helpers). Below the header, an editable "required helpers" field and a table of assigned helpers (with remove buttons) allow quick management. A dropdown adds unassigned helpers. Clicking a task card header opens the task detail panel. The shared filter panel (groups, deadline, status, tags, etc.) applies to the task list.

### Helpers
Inline-editable table for managing internal helpers (`helpers.json`). Add, edit, or remove people with name, email, phone, and address.

### Entities
Inline-editable table for managing external contacts and organizations (`external_entities.json`).

## Interaction Concepts

### Filtering
The left filter panel (toggle via the filter icon) provides:
- **Deadline within**: quick-select buttons (7d, 14d, 30d, 90d)
- **Flags**: checkboxes for "has unresolved issues" and "has unanswered questions"
- **Status**: toggle chips (todo, in progress, finished, cancelled)
- **Tags**: toggle chips for all tags found across tasks
- **Groups**: checkboxes with color circle + group path (via `GroupBadge`)
- **Helpers**: checkboxes with name badges

Filters apply to both the Timeline and Tasks table views. The Issues and Questions views have their own dedicated filter panels (see above).

### Task Detail Panel
Clicking a task (node or table row) opens the right detail panel with collapsible sections:
- **Metadata**: deadline, status, assignee, group (dropdown selector — changing group moves the file on disk)
- **Helpers**: required count + assigned helper chips with add/remove
- **Relations**: dependencies, tags, external entities (collapsed by default)
- **Description**: rendered markdown with click-to-edit
- **Questions**: each with title, recurring flag, and markdown answer
- **Issues**: each with description, assignee, and solution (unresolved issues highlighted in red)
- **Log**: chronological entries with date and markdown body

All markdown sections support a view/edit toggle: click to edit in a textarea, save or abort.

### Creating and Deleting Tasks
- **"+ New Task"** button in the top bar opens a dialog to select a group and enter a task ID
- **"Delete task..."** button at the bottom of the detail panel (with confirmation)

Both operations create/remove the corresponding `.md` file on disk.

### Creating Groups
All group dropdown selectors (in the task detail panel and the "New Task" dialog) include a **"+ New group…"** option as the first entry. Selecting it opens a dialog where you can:
- Enter a group name
- Optionally select a parent group (for nested groups like `pferd/feeding`)
- Pick a display color from a preset palette or a custom color picker

The new group directory and `group.json` are created on disk immediately.

## Data Structure

### Directory Layout

```
<project>/
├── project.json           # Project-level metadata
├── helpers.json           # People who help execute tasks (internal)
├── external_entities.json # External contacts referenced in tasks
├── documents/             # Attachments and images (arbitrary subdirectories)
│   ├── <file>
│   └── <subdir>/
│       └── <file>
└── tasks/
    └── <group>/
        ├── group.json     # Group metadata (optional; defaults to grey)
        ├── <task>.md      # One file per task
        └── <subgroup>/    # Groups can be arbitrarily nested
            ├── group.json
            └── <task>.md
```

### `project.json`

| Field         | Type   | Description                                                  |
|---------------|--------|--------------------------------------------------------------|
| `name`        | string | Display name of the project                                  |
| `anchor_date` | string | Reference date (`YYYY-MM-DD`); task deadlines are relative to this |

### `helpers.json`

A map keyed by short identifier. Each entry has: `name`, `email`, `phone`, `address`.

### `external_entities.json`

A map keyed by short identifier. Each entry has: `name`, `description`, `type`, `email`, `phone`, `address`.

### `tasks/<group>/group.json`

Optional. Fields: `color` (hex, defaults to grey), `description`.

### `tasks/<group>/<task>.md`

Each task is a Markdown file with a structured format. The filename (without `.md`) is the task's unique ID.

**Header fields** (after `# Title`):
- `deadline`: relative offset (`-5d`, `+2d`) or absolute date (`YYYY-MM-DD` or `YYYY-MM-DD HH:MM`)
- `assignee`: helper ID
- `n_helpers_needed`: integer
- `status`: `todo`, `in_progress`, `finished`, or `cancelled`

**Sections**:
- `## Depends On` — list of task IDs
- `## Tags` — list of strings
- `## External Entities` — list of entity IDs
- `## Helpers` — list of helper IDs
- `# Description` — free text (markdown)
- `# Questions` — `## Question Title [r]` with optional `### Answer`
- `# Issues` — `## Issue Title` with optional `### Assignee` and `### Solution`
- `# Log` — `## YYYY_MM_DD Title` with free text body

User-written headings within content sections are automatically elevated on save and demoted on load to avoid collision with structural markers. This is transparent — the user always writes normal `#` headings.

**Full example:**

```markdown
# Feed the Horses
deadline: -5d  
assignee: bs  
n_helpers_needed: 10  
status: in_progress

## Depends On
- put_things

## Tags
- feeding
- garden

## External Entities
- horse_manager

## Helpers
- bs
- vs

# Description
The horses need to be fed.

# Questions
## How many horses need to be fed? [r]
### Answer
10 Horses

## How much feed is needed?

# Issues
## One horse is not hungry
This is a problem.

### Assignee
bs

### Solution
We wait until it is hungry again.

# Log
## 2026_01_10 We made progress
We have gathered information!
```

## Technical Details

See [architecture.md](architecture.md) for the full technical architecture, file structure, design decisions, and state management documentation.
