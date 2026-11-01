---
'@macts/mcp': minor
'@macts/cli': minor
'@macts/runtime': minor
---

MCP tool calls run through the same pipeline as the HTTP API

`macts --mcp` (stdio) and the MCP daemon (`macts mcp serve` and `macts mcp start`, over HTTP) now run every tool call through the shared runtime: the caller's API key is verified, its permissions are checked, this Mac's governance policy is enforced and audited, and the input is validated against the operation's contract, all before the app is touched. Both register the installed apps through the same host path as `macts --serve`, serve one tool per operation of every installed app beside the capability-discovery tool, and no longer route a call through an HTTP hop to the API server.

Results and errors use the structured shapes of the HTTP API. A successful call returns one text item holding `{ "result": <wire value> }`; a failed call is a tool result with `isError: true` holding `{ "error": { "code", "message", "details" } }`, with the same code, message, and details as the HTTP API for the same call. An unexpected failure is reported as `INTERNAL`, and its original text is logged on the host, never returned.

The HTTP daemon governs each request by its own key. Every route except `GET /health` requires `Authorization: Bearer <key>`; each tool call runs under the key of the request that carried it, so two clients with different keys on one daemon are each governed by their own key. A request without a usable key is refused with `401`, `WWW-Authenticate: Bearer`, and the HTTP API's `UNAUTHENTICATED` error, whose `details.reason` is `missing`, `malformed`, `invalid`, `expired`, or `revoked`. `GET /health` now answers `{ "status": "ok", "tools": <count> }` (previously `plugins`).

Over stdio, `MACTS_API_KEY` is required at startup and is presented on every call; a key revoked during the session is refused on its next call. All of `macts --mcp`'s diagnostics, including the startup report of served, failed, and missing apps, go to stderr, so stdout carries only the protocol.

**`--disable-api-key-validation` is removed** from `macts --mcp`, `macts mcp serve`, and `macts mcp start`. Passing it is an error that names the replacement, and setting `MACTS_DISABLE_API_KEY_VALIDATION` has no effect beyond a warning on stderr. Instead: create a key with `macts api-key create --name <name> --permission <app:resource:operation>`, then set it as `MACTS_API_KEY` (or send it as a bearer token to the daemon).

Other behavior changes:

- `macts mcp serve` starts when no app is installed, serving only the capability-discovery tool (previously it exited with an error).
- `macts mcp diagnose` reports installed apps under `apps` (`totalLoaded`, `totalFailed`, `apps`, `failed`, `missingHost`) instead of `plugins`, and its health check reports `tools`.
- The capability-discovery tool answers with compact JSON, and reports a failure as `INTERNAL` instead of returning the error's text.

`@macts/mcp` API changes:

- `createDaemon(options)` takes the `adapter` to serve and an optional `verifier` (default: the local key store) in place of `plugins` and `disableApiKeyValidation`.
- `createDiscoveryTool()` returns an `McpHostTool`.
- New: `withHostTools(adapter, hostTools)` serves tools that run no operation beside an adapter's operation tools, and refuses duplicate names with `McpToolCompositionError`. `startStdioServer({ adapter, credential })` serves an adapter over stdio. Types `McpHostTool`, `McpHostToolsOptions`, `StdioServer`, and `StdioServerOptions`.
- Removed: `createMcpServer`, `McpServerOptions`, `requireStartupApiKey`, `authenticateHttpRequest`, `McpAuthErrorCode`, `AuthResult`, `discoverMcpPlugins`, `loadMcpPlugin`, `readMcpPluginCache`, `writeMcpPluginCache`, `invalidateMcpPluginCache`, `PluginDiscoveryResult`, `PluginLoadError`, `CachedPlugin`, and the re-exports of `McpPlugin`, `McpToolDefinition`, and `JsonSchema` (still exported by `@macts/types`).
- Removed: the `macts-mcp` bin. Use `macts --mcp`.

`@macts/cli` API changes: `RootCommand` no longer has a `disableApiKeyValidation` property.

`@macts/cli` no longer ships the `macts-mcp-stdio` bin. Use `macts --mcp`, with the key in `MACTS_API_KEY`, instead. The old bin piped raw stdio into the daemon's socket and never carried a bearer token, so it could not authenticate to the daemon.

`@macts/runtime` adds a `destination` parameter to `createLogger(options, destination)`, with the `LogDestination` type (`'stdout'`, the default, or `'stderr'`), so a host whose stdout is a protocol channel can log to stderr.
