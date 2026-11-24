---
'@macts/runtime': patch
---

Opening the API-key store on a fresh macts home no longer fails with `database is locked` when several processes open it at once. The store sets its busy timeout before its first statement and retries the switch to WAL while SQLite reports busy, for at most the busy timeout.
