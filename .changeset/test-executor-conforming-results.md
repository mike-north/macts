---
'@macts/cli': patch
---

The host's built-in test executor answers with values the operations' output contracts admit: an empty list for a list operation, and `TargetNotFoundError` for an operation that needs an existing object.
