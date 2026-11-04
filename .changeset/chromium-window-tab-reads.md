---
'@macts/google-chrome': minor
'@macts/microsoft-edge': minor
---

Google Chrome windows and tabs can now be read:

- `windows.list` and `windows.get(id)`.
- `tabs.list(windowId)` and `tabs.get(windowId, id)`. Chrome holds each tab in its window and has no list of every tab, so a tab is listed and read within its window.

A window's or tab's id identifies it while Chrome keeps running; it is not promised to stay the same after Chrome quits and opens again.

Breaking change in Microsoft Edge: `tabs.get` now takes the tab's window as well as its id, `tabs.get(windowId, id)`, and the CLI's `windows tabs get` takes `--window-id`. Edge, like Chrome, has no list of every tab, so a tab can be read only within its window; before, the read looked for the tab in a list Edge does not have. This follows Edge's scripting dictionary and has not been verified on an installed Edge.

A window's `activeTab` is left out of Chrome and Edge window records for now: macts cannot yet return a reference to a tab together with its window. It is planned to come back. In Edge it was returned before, but a caller could not use it to read the tab.
