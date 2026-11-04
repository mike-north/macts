---
'@macts/finder': minor
'@macts/google-chrome': minor
'@macts/iterm': minor
'@macts/mail': minor
'@macts/music': minor
'@macts/tv': minor
---

Breaking change: the application-level `delete` operation is removed from Finder, Google Chrome, iTerm, Mail, Music and TV.

Each app declared `delete` at application scope with no parameters, so the operation named no item to delete. Each manifest now leaves it out. The removed pieces are the `<app>.app.delete` operation, the `_delete()` method of the contract client and of the HTTP client, the CLI's `delete` command, and the capability entry. A delete for these apps comes back once it can name the item it acts on.
