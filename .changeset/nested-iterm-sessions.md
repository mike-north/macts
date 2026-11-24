---
'@macts/contracts': minor
'@macts/core': minor
'@macts/runtime': minor
'@macts/iterm': minor
---

Read iTerm sessions by Window and Tab, and hydrate current-session references within their Window. Add versioned explicit nested addresses while reserving screen text for separate reads.

Format 1.0 capability discovery now names a command whose key differs from its verb (and that declares no `routeName`) by the operation and MCP tool the runtime actually serves, such as `notebook.notes.listNotes` and `macts__notebook__notes_list_notes`, instead of the nonexistent `notebook.notes.list`. No shipped manifest's discovery output changes, and format 1.0 calling sources and native bodies are otherwise unchanged.
