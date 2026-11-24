---
'@macts/core': minor
'@macts/iterm': minor
---

A generated CLI command now sits under the collections its address selects. In format 1.1, a command that declares its ancestors is placed under those ancestors' collections followed by its target's collection, leaving out any collection its identity traversal searches; capability CLI snippets name the same path.

The iTerm Session resolve and Session write, which take a Window and search every Tab of it, move from `macts iterm windows tabs sessions resolve` and `macts iterm windows tabs sessions write` to `macts iterm windows sessions resolve` and `macts iterm windows sessions write`. The old paths are removed. Their routes, permissions, MCP tools and SDK methods are unchanged.
