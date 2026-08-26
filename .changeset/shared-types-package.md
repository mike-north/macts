---
'@macts/types': minor
'@macts/core': patch
'@macts/mcp': patch
---

Add `@macts/types`, a zero-runtime package holding the shared MCP plugin type
definitions (`JsonSchema`, `McpToolDefinition`, `McpPlugin`).

Generated `@macts/<app>-server` packages used these types only — no value import
existed — but declared `@macts/mcp` as a peer dependency to get them. They now
depend on `@macts/types` directly, so a server package no longer implies a
dependency on the MCP server implementation.

`@macts/mcp` re-exports all three types, so importing them from `@macts/mcp`
continues to work unchanged.
