# @macts/types

## 0.2.0

## 0.1.0

### Minor Changes

- c7ac226: Add `@macts/types`, a zero-runtime package holding the shared MCP plugin type
  definitions (`JsonSchema`, `McpToolDefinition`, `McpPlugin`).

  Generated `@macts/<app>-server` packages used these types only — no value import
  existed — but declared `@macts/mcp` as a peer dependency to get them. They now
  depend on `@macts/types` directly, so a server package no longer implies a
  dependency on the MCP server implementation.

  `@macts/mcp` re-exports all three types, so importing them from `@macts/mcp`
  continues to work unchanged.
