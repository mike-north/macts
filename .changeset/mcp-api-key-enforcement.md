---
'@macts/mcp': minor
'@macts/cli': minor
---

**BREAKING BEHAVIOR:** the MCP server now requires a valid API key by default on every transport:

- **stdio** — set `MACTS_API_KEY` in the environment (e.g. the MCP client's `env` config) before starting the server. Startup fails immediately with an actionable error if the key is missing or invalid.
- **HTTP (daemon)** — every route except `GET /health` requires `Authorization: Bearer macts_sk_...`.

Existing installs that don't set `MACTS_API_KEY` (or don't send a bearer token to the daemon) will start failing until a key is created and configured. Create one with:

```
macts api-key create --name <name> --permission <app:resource:operation>
```

A new `--disable-api-key-validation` flag opts back out of this check on `macts --mcp`, `macts mcp serve`, and `macts mcp start` (not recommended; intended for local development or trusted embedding).

Also new/fixed in this release:

- New streamable HTTP transport at `/mcp` (the current MCP spec transport), alongside the existing legacy SSE transport (`/sse` + `/message`).
- Fixed the legacy SSE `POST /message` endpoint, which previously always returned 404.
- Fixed a teardown bug where restarting the SSE transport left a stale double-started session.
