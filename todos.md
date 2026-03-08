- PDF- und Excel-Export der ganzen Tabellen und der Helferliste
- add optional color field to helper data. Used to draw color of assignee badge in nodes
- Refactor and cleanup! There are many duplicates! Need more constants instead of repeating stuff - in particular possible values and file structures! Good example: in TaskTableView, the possible taks statuses are hardcoded!!! I bet they are at other places, too! Also elements like dropdowns are styled indivdually instead of using a shared dropdown style!
- BUG: Title of Task in detail panel is not editable
- BUG: filtering by groups in timeline view behaves glitchy sometimes In tasks table, it works fine. In timeline, for some groups or when switching back and forth between groups, sometimes no nodes or only singe nodes are shown.
The timeline arrow sometimes even disappears!