---
'@macts/google-chrome': minor
'@macts/microsoft-edge': minor
---

Google Chrome windows and tabs can now be read:

- `windows.list` and `windows.get(id)`.
- `tabs.list(windowId)` and `tabs.get(windowId, id)`. Chrome holds each tab in its window and has no list of every tab, so a tab is listed and read within its window.

A window or tab id identifies it within one browser session: ids start over when the browser is relaunched, so an id kept across a relaunch may name a different window or tab, not merely fail to find one. Nothing shows an id changing while the browser keeps running.

Breaking change in Microsoft Edge: `tabs.get` now takes the tab's window as well as its id, `tabs.get(windowId, id)`, and the CLI's `windows tabs get` takes `--window-id`. Edge, like Chrome, has no list of every tab, so a tab can be read only within its window; before, the read looked for the tab in a list Edge does not have. This follows Edge's scripting dictionary and has not been verified on an installed Edge.
