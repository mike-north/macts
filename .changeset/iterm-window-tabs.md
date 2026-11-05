---
'@macts/iterm': minor
---

iTerm windows and tabs can now be read:

- `windows.list` and `windows.get(id)`.
- `tabs.list(windowId)` and `tabs.get(windowId, index)`.

iTerm gives a tab no id, so a tab is selected by its zero-based position within its window. A window's `currentTab` is returned as a selector for that position within the window, and resolves to the tab there.

A position is not a lasting name for a tab: it drifts when tabs open, close or move, so a position kept for later may select a different tab.
