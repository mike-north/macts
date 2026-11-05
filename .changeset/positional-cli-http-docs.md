---
'@macts/core': patch
---

The generated CLI get help, and the generated HTTP client's get, update and delete, now say what the contract client already says about an object with no id: it is selected by its zero-based position within its parent, and that position drifts when objects open, close or move.
