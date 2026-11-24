---
'@macts/iterm': minor
---

Remove the application-level `write` command (`iterm.app.write`, permission `iterm:app:write`, `macts iterm write`, `client.write`, and the `macts__iterm__app_write` MCP tool). It typed text into iTerm with no session address. Use the session write (`iterm.sessions.writeText`, permission `iterm:sessions:writeText`) instead, which names the window and session it types into.
