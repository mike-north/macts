---
'@macts/automator': minor
'@macts/automator-server': minor
'@macts/calendar': minor
'@macts/calendar-server': minor
'@macts/microsoft-edge': minor
'@macts/microsoft-edge-server': minor
'@macts/microsoft-word': minor
'@macts/microsoft-word-server': minor
'@macts/notes': minor
'@macts/notes-server': minor
'@macts/omnifocus': minor
'@macts/omnifocus-server': minor
'@macts/omnigraffle': minor
'@macts/omnigraffle-server': minor
'@macts/omniplan': minor
'@macts/omniplan-server': minor
'@macts/photos': minor
'@macts/photos-server': minor
'@macts/reminders': minor
'@macts/reminders-server': minor
'@macts/shortcuts': minor
'@macts/shortcuts-server': minor
'@macts/terminal': minor
'@macts/terminal-server': minor
'@macts/textedit': minor
'@macts/textedit-server': minor
'@macts/xcode': minor
'@macts/xcode-server': minor
---

App permission groups now list only permissions that some operation requires.

The permission groups in 14 app manifests listed 122 permissions that no operation required, such as `microsoft-edge:tabs:update` (Edge has no tab update operation) and `calendar:calendars:delete`. Granting one authorized nothing. They are removed from the permission groups that discovery and the generated packages publish, and a test over every shipped manifest keeps them from coming back. An operation's permission returns to its group together with the operation's command.

Grants of the removed permissions authorized nothing before and still authorize nothing. When one is requested, `macts api-key create` now warns that no route requires it and suggests the closest permission that one does. Before, it said the permission was listed in the manifest's permissions map.
