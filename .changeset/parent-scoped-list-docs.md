---
'@macts/automator': patch
'@macts/calendar': patch
'@macts/microsoft-edge': patch
'@macts/omnigraffle': patch
'@macts/reminders': patch
'@macts/xcode': patch
---

The HTTP client's `list` method for items held by another item now says it lists the items of one parent, for example "List the events of one calendar.", instead of "List all events." Only the documentation changes.
