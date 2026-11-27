---
'@macts/sdk': patch
---

`packages/sdk/AUTHORING.md` reads list results through `Page.items`. The quick start now checks the reminders listing before it creates anything, and the worked example follows `nextCursor` to find the list named "Reminders", keeping the first list as the fallback.
