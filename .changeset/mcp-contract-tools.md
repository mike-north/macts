---
'@macts/mcp': minor
---

Serve MCP tools derived from operation contracts, dispatched through the shared runtime

**`@macts/mcp`** can now serve every operation registered on a `MactsRuntime` as an MCP tool, with no generated tool code. The existing plugin-based server is unchanged.

- **`createMcpAdapter(runtime, options?)`** derives one tool per registered operation and runs each tool call as one `runtime.invoke`, so MCP calls pass through the same credential, permission, governance, and input checks as the HTTP API and the SDK. `listTools()` returns the tools; `callTool(name, args, context)` handles one call.
- **`attachMcpAdapter(server, adapter, resolveCredential)`** registers the `tools/list` and `tools/call` handlers on an MCP SDK `Server`. The resolver locates each call's credential in the request context (the startup key for stdio, the per-request bearer for HTTP), and each request's abort signal cancels the operation.
- **Tool names** come from the operation id: `<app>.<resource>.<operation>` is served as `macts__<app>__<resource>_<operation in snake case>`, for example `macts__calendar__app_reload_calendars`. `toolNameFor(id)` exposes the derivation.
- **Input schemas** are the JSON Schema (draft 7) of each operation's wire contract, and are always object schemas. An operation whose contract cannot be represented, or two operations that derive the same tool name, make the adapter refuse to build with `McpToolDerivationError`, naming the operations involved.
- **Results and errors** use the same shapes as the HTTP API. Success is `{ "result": <wire value> }`; a failure is `isError: true` with `{ "error": { code, message, details } }`. An unexpected failure is a generic `INTERNAL` that never repeats the underlying message, and a call to an unknown tool is an MCP `InvalidParams` protocol error.
