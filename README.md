# Machma

Machma is a tool for managing tasks for events.
It aims to be lean and simple.

Important feature: machma is entirely text based. 
So, whereas the UI may be used, the text files can be edited independently with any text editor and version control can be used directly for the projects.

Core interaction is through a graph-like timeline of all tasks that can be filtered, scrolled / zoomed / panned.
CLicking on a task opens a detail view of the task that is editable and reflects the md files content.

There are other views like a tabular overview of all tasks as well as helper management and external entity management.

External entities are persons or other organizations etc. that we need to contact or that we are somehow working with in the project.

# UI 
The UI provides an overview of the tasks and their dependencies in a node-like graph with a timeline view.
Left and right are collapsible panels. 
Left shows filtering options. Right shows currently selected task.
Tasks shall be somehow clustered / grouped by groups while still reflecting the correct position in the timeline.

![UI](docs/main.png)

# Data Structure
The data structure is as follows:

## Directory Layout

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

---

## `project.json`

Project-level metadata.

| Field         | Type   | Description                                                  |
|---------------|--------|--------------------------------------------------------------|
| `name`        | string | Display name of the project                                  |
| `anchor_date` | string | Reference date (`YYYY-MM-DD`); task deadlines are relative to this |

```json
{
    "name": "Example Project",
    "anchor_date": "2026-05-01"
}
```

---

## `helpers.json`

A map of internal helpers (people involved in running the event/project), keyed by a short identifier.

| Field     | Type   | Description          |
|-----------|--------|----------------------|
| `name`    | string | Full name            |
| `email`   | string | Email address        |
| `phone`   | string | Phone number         |
| `address` | string | Postal address       |

```json
{
    "bs": {
        "name": "Ben Schmid",
        "email": "ben@schmid.com",
        "phone": "1234567890",
        "address": "123 Main St, Anytown, USA"
    }
}
```

---

## `external_entities.json`

A map of external contacts or organisations that are referenced in tasks but are not internal helpers, keyed by a short identifier.

| Field         | Type   | Description                        |
|---------------|--------|------------------------------------|
| `name`        | string | Display name                       |
| `description` | string | What this entity is/does           |
| `type`        | string | Entity type (e.g. `"person"`)      |
| `email`       | string | Email address                      |
| `phone`       | string | Phone number                       |
| `address`     | string | Postal address                     |

```json
{
    "horse_manager": {
        "name": "Horse Manager",
        "description": "The horse manager is responsible for the horses.",
        "type": "person",
        "email": "horse@manager.com",
        "phone": "1234567890",
        "address": "123 Main St, Anytown, USA"
    }
}
```

---

## `documents/`

An optional directory for any files (PDFs, images, spreadsheets, etc.) associated with the project. The directory may contain arbitrary subdirectories.

Files are referenced from within task Markdown files using paths **relative to `documents/`**:

```markdown
[Floor plan](floor_plan.pdf)
![Setup photo](photos/setup_01.jpg)
```

---

## `tasks/<group>/group.json`

Optional metadata for a task group (subdirectory under `tasks/`). If `group.json` is absent, the group is rendered in grey with no description.

| Field         | Type   | Required | Description                        |
|---------------|--------|----------|------------------------------------|
| `color`       | string | no       | Hex color code for UI display; defaults to grey if omitted |
| `description` | string | no       | Short description of the group     |

```json
{
    "color": "#0000FF",
    "description": "This is a group for miscellaneous tasks."
}
```

---

## `tasks/<group>/<task>.md`

Each task is a Markdown file. The filename (without `.md`) serves as the task's unique identifier within the project.

### Header & Inline Fields

The first line is the task title as a level-1 heading. Immediately below, key-value fields are written as inline Markdown (one per line, terminated with two trailing spaces):

| Field             | Type   | Description                                                                 |
|-------------------|--------|-----------------------------------------------------------------------------|
| `deadline`        | string | Relative offset from `anchor_date` (e.g. `-10d`, `+2d`), an absolute date (`YYYY-MM-DD`), or an absolute date and time (`YYYY-MM-DD HH:MM`) |
| `assignee`        | string | Helper ID (key from `helpers.json`) responsible for the task               |
| `n_helpers_needed`| int    | Number of helpers required to carry out the task                            |
| `status`          | string | Status of the task (`in_progress`, `finished`, `todo`, `cancelled`)                 |

### Sections

| Section              | Syntax                          | Description                                                                 |
|----------------------|---------------------------------|-----------------------------------------------------------------------------|
| `## Depends On`      | list of task IDs                | Tasks that must be completed before this one                                |
| `## Tags`            | list of strings                 | Free-form labels for filtering/grouping                                     |
| `## External Entities` | list of external entity IDs   | External contacts referenced by this task                                   |
| `## Helpers`         | list of helper IDs              | Helpers assigned to support this task                                       |
| `# Description`      | free text                       | Detailed description of the task                                            |
| `# Questions`        | see below                       | Open or answered questions related to the task                              |
| `# Issues`           | see below                       | Problems or blockers associated with the task                               |
| `# Log`              | see below                       | Chronological progress entries                                              |

### Questions

Each question is a level-2 heading. Append `[r]` to mark it as **recurring** (relevant in every iteration of the task). Answers are written in a `### Answer` subsection.

```markdown
## How many horses need to be fed? [r]
### Answer
10 Horses
```

### Issues

Each issue is a level-2 heading. An issue without `### Assignee` or `### Solution` is considered **unresolved and not in progress**.

```markdown
## One horse is not hungry
This is a problem.

### Assignee
bs

### Solution
We wait until it is hungry again.
```

### Log

Each log entry is a level-2 heading with the date in `YYYY_MM_DD` format followed by a short title. The body is free text. Multiple entries are allowed.

```markdown
## 2026_01_10 We made progress
We have gathered information!
```

### Full Example

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
