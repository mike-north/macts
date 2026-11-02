---
'@macts/cli': minor
---

macts serves each app from its server package's contract

`macts --serve`, `macts --mcp`, and the MCP daemon (`macts mcp serve` and `macts mcp start`) now load each installed app from its server package, `@macts/<app>-server`, which exports the app's contract. The server package is what you install to serve an app (`macts mcp install <app>`), and the app package it depends on comes with it.

Server packages installed by an older macts do not export the contract and are not served. The startup report names each one with the command that fixes it, for example:

```text
Not serving 1 app(s) that failed to register:
  notes: @macts/notes-server is from an older macts and does not export its app's contract. Reinstall it with `macts mcp install notes`.
```

Every other installed app is still served. `macts mcp diagnose` reports the same reason under `apps.failed`.

`@macts/types` is no longer published. Its MCP plugin types described generated MCP tool definitions that no longer exist: macts serves every app from its contract. Remove any dependency on it.
