---
'@macts/core': minor
'@macts/cli': patch
'@macts/mcp': patch
---

Capability CLI snippets and the generated CLI now come from one command tree, so a snippet always names a command the app's CLI registers. A capability whose operation has no CLI command (a resource update or delete, a create where the hierarchy entry is read-only, or a resource with no hierarchy entry) now has no `cliSnippet` instead of one naming a command that does not exist; `Capability.cliSnippet` is `string | undefined`. Affected today: Calendar event update and delete, Microsoft Edge tab and window create, Notes attachment list and get, Reminders delete, System Events action perform and UI element click and select, and Terminal tab list and get.

`macts capabilities inspect` and `search`, and the MCP discovery tool, report `call: null` for such a capability; the human-readable output names its MCP tool instead.

CLI generation now refuses a manifest in which two commands are placed at the same CLI path, naming the path and each command.
