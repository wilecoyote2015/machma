- PDF and Excel export of the full tables and the helper list
- Milestone Functionality: a milestone is one md document in a "milestones" directory. Milestone will be drawn as horizontal line in the timeline view and at timeline, there is an icon to click to open milestone details. Milestone hline is drawn so that it is below the last node of that day.
- make project metadata an md file instead of json. The file shall be similar to tasks: first heading is the project name. Anchor date is the second section. Then there is a description and also a questions section, like in taks (but no issues etc.). The questions from here show up in the questions view table with - in the task column.
- "Project" view for editing project metadata.
- Sorting in sortable tables: secondary sorting should maybe always by name? Or dependent on what is sorted by?
- Align question format in MD with issue format, also allowing description that then will be shown in the question detail panel and question table description column.


# MCP server for AI support
Implement a simple MCP server that helps AI when editing the project files in an AI IDE.
Here, the user can leverage the fact that Machma uses a file-based structure: one can simple use the AI system one likes to help managing the project files.
One example use case: you get some documents with task descriptions, emails, excel-files and so on and let the AI integrate the info into your tasks.

all tools that access project data get the absolute path to the project directory as arg.

tools:
- get_tasks: get the tasks from the project in a compact form: like the table task view, but with additional "filepath" column yielding the absolute path to the task file. Description is truncated to 100 characters. Gets optional args for filtering: group, status, assignee, datetime range of deadline, datetime range of start date, tags, issues, questions
- get_questions: get the questions from the project in a compact form: like the table question view, but with additional "filepath" column yielding the absolute path to the task file. Description is truncated to 100 characters. Gets optional args for filtering: task group, task, status, assignee, datetime range of deadline, datetime range of start date
- get_issues: get the issues from the project in a compact form: like the table issue view, but with additional "filepath" column yielding the absolute path to the task file. Description is truncated to 100 characters. Gets optional args for filtering: task group, task, status, assignee, datetime range of deadline, datetime range of start date
- machma_help: get information about the machma project structure and how to use it. This returns a technical kind of readme for the AI to understand how a machma project is set up, how the files are structured etc. This should be called at the beginning of a conversation to make sure the AI knows how machma works. It also provides a complete example task file for the AI to understand how to write and modify task files.

I guess it will be best to write it in typescript with modelcontextprotocol
typescript-sdk lib.