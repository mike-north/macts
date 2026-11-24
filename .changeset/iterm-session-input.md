---
'@macts/core': minor
'@macts/iterm': minor
---

Write text into an iTerm session, optionally followed by a newline. The session is addressed by its Window-scoped identity, and writing requires its own `iterm:sessions:writeText` permission, separate from every session read. Resource commands that act on one item can now find it through a declared identity traversal.
