---
'@macts/automator': minor
'@macts/calendar': minor
'@macts/mail': minor
'@macts/microsoft-edge': minor
'@macts/microsoft-word': minor
'@macts/music': minor
'@macts/notes': minor
'@macts/omniplan': minor
'@macts/photos': minor
'@macts/reminders': minor
'@macts/shortcuts': minor
'@macts/system-events': patch
'@macts/system-settings': minor
'@macts/tv': minor
'@macts/xcode': minor
---

Resource commands now send the app the item you name, and take the same inputs as the resource's `get`: the parent's identifier where the get takes one, then the item's identifier, then the command's other parameters. Each manifest edit cites the command's direct parameter in the app's scripting dictionary.

**Breaking changes in the SDK, contract and CLI inputs:**

- **Automator:** `workflows.execute(name)` takes the workflow's name, in place of `workflow`.
- **Calendar:** `events.show(calendarId, id)`.
- **Mail:** `outgoingMessages.send(id)` takes the outgoing message's integer id.
- **Microsoft Edge:** the tab commands (`reload`, `goBack`, `goForward`, `selectAll`, `cutSelection`, `copySelection`, `pasteSelection`, `undo`, `redo`, `stop`, `viewSource` and `execute`) take `(windowId, id, ...)` in place of `tabId`.
- **Microsoft Word:** the document commands (`activate`, `close`, `createRange`, `print`, `save` and `saveAs`) take the document's name first.
- **Music:** `playlists.move` and `playlists.search` take the playlist's `persistentID` first.
- **TV:** `playlists.move` and `playlists.search` take `(sourceId, persistentID, ...)`.
- **Reminders:** `reminders.show(id)`.
- **Xcode:** the workspace document commands (`attach`, `build`, `clean`, `debug`, `run`, `stop` and `test`) take `name` in place of `workspaceName`.
- **Notes, Photos and Shortcuts:** the SDK and contract are unchanged. Their CLI commands (`notes show`, `mediaItems duplicate` and `shortcuts run`) take the item as their one positional. They no longer ask for it a second time as a flag, or for parent flags they never used, such as `--album-id`.

**Removed commands that do nothing:**

- **Mail:** `messages.bounce`, which Mail's dictionary describes as "Does nothing at all (deprecated)".
- **System Settings:** `panes.authorize` and `panes.timedLoad`, which its dictionary says no longer do anything. With them, the SDK's `panes` client and `PaneResourceClient` are removed, since panes had no other commands.

OmniPlan `fix`, Music and TV `refresh`, System Events `click`, `perform` and `select`, and Mail `forward`, `redirect` and `reply` cannot select their item yet. They behave as before, and their docs now say that macts does not yet send the item to the app. Their CLI commands no longer ask for a positional or parent flags they never used.

Refs #287
