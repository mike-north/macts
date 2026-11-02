# @macts/mcp

Model Context Protocol server for macOS application automation.

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open protocol that enables AI assistants like Claude to integrate with external tools and data sources. This package serves every installed macts app's operations as MCP tools.

Every tool call runs through the same pipeline as a call to the macts HTTP API: the caller's API key is verified, its permissions are checked, this Mac's governance policy is enforced and audited, and the input is validated against the operation's contract, all before the app is touched. The MCP server adds no policy of its own and has no trusted-caller mode.

## Installation

This package is typically used through the `macts` CLI, which handles app installation and server startup.

Install an app's server package:

```bash
macts mcp install calendar
```

This installs the `@macts/calendar-server` package into `~/.macts/plugins/`
(override the location with the `MACTS_HOME` environment variable). Installed
apps are found when the server starts; restart a running server after
installing so it serves the new tools.

## Choosing a Transport

Pick the transport when you start the server:

| You want                                                        | Run                                    | Credential                                          |
| --------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------- |
| An MCP client that starts the server itself (Claude Desktop, …) | `macts --mcp`                          | `MACTS_API_KEY` in the server's environment         |
| One long-running server that several clients connect to         | `macts mcp serve` or `macts mcp start` | `Authorization: Bearer <key>` on every HTTP request |

Both serve the same tools: one per operation of every installed app, plus the
built-in `macts__capabilities__discover` tool.

### stdio: `macts --mcp`

The server speaks MCP on stdin and stdout; all diagnostics go to stderr. It
requires `MACTS_API_KEY` at startup and presents that key on every tool call.
The key is verified on every call, so a key revoked while the session runs is
refused on its next call.

### HTTP: `macts mcp serve` / `macts mcp start`

```bash
# Start daemon in background
macts mcp start

# Check daemon status
macts mcp status

# Stop daemon
macts mcp stop

# Run in foreground (for debugging)
macts mcp serve
```

The daemon listens on a Unix socket (`~/.macts/mcp.sock`) by default, or on
`127.0.0.1:<port>` with `--port`. It exposes two HTTP transports:

- **Streamable HTTP** at `/mcp`: the current MCP transport, and the primary way to talk to the daemon over HTTP.
- **Legacy SSE** at `/sse` + `/message`: the deprecated HTTP+SSE transport, kept for older clients.

Every route except `GET /health` requires `Authorization: Bearer macts_sk_...`.
Each tool call runs under the key of the request that carried it, so clients
with different keys on one daemon are each governed by their own key. A
request without a usable key is refused with `401` and the same structured
error the HTTP API sends:

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "No credential was presented.",
    "details": { "reason": "missing" }
  }
}
```

`details.reason` is one of `missing`, `malformed`, `invalid`, `expired`, or
`revoked`.

See [DAEMON.md](./DAEMON.md) for complete daemon documentation.

## Getting a Key

Create a key holding the permissions the agent needs (repeat `--permission`
for more than one):

```bash
macts api-key create --name <name> --permission <app:resource:operation>
```

`--disable-api-key-validation` and `MACTS_DISABLE_API_KEY_VALIDATION` have been
removed. Passing the flag is an error; setting the variable has no effect
beyond a warning. Create a local key instead and set it as `MACTS_API_KEY` (or
send it as a bearer token to the daemon).

## Integration with Claude Desktop

Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "macts": {
      "command": "macts",
      "args": ["--mcp"],
      "env": {
        "MACTS_API_KEY": "macts_sk_..."
      }
    }
  }
}
```

After restarting Claude Desktop, the macts tools will be available to Claude.

## Results and Errors

**Results.** A successful call returns one text content item holding
`{ "result": <wire value> }`. File results are metadata and fetch handles,
never inlined bytes.

**Errors.** A failed call is a tool result with `isError: true` and one text
content item holding the same envelope the HTTP API sends:

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Missing required permission \"notes:attachments:get\". ...",
    "details": { "required": "notes:attachments:get", "hint": "..." }
  }
}
```

`code` is one of the structured error codes (`VALIDATION_FAILED`,
`UNAUTHENTICATED`, `PERMISSION_DENIED`, `POLICY_DENIED`, `TARGET_NOT_FOUND`,
`INTERNAL`, and so on), and `details` is typed per code. The same call fails
with the same code, message, and details over stdio, over the daemon, and over
the HTTP API. An unexpected failure is reported as `INTERNAL`; its original
text is logged on the host and never returned. A call to a tool the server
does not serve is an MCP protocol error (`InvalidParams`), not a tool result.
See `phases/13-sdk-value-and-execution-contracts.md` (D6, D9) for the full
error table and schema rules.

## Tool Names and Schemas

**Names.** A tool's name is derived from its operation id
`<app>.<resource>.<operation>` as `macts__<app>__<resource>_<operation>`. The
app and resource are kept as they are; the operation becomes snake case, with
runs of capitals kept as one word:

- `calendar.app.reloadCalendars` → `macts__calendar__app_reload_calendars`
- `mail.app.getURL` → `macts__mail__app_get_url`
- `automator.automatorActions.list` → `macts__automator__automatorActions_list`

There are no per-tool overrides. If two operations derive the same name, the
server refuses to start and names both.

**Input schemas.** Each tool's `inputSchema` is
`z.toJSONSchema(input.wire, { target: 'draft-7' })` of the operation's wire
contract, so it describes values as they travel in JSON (for example, a date
is `{ "date": "<ISO 8601>" }`). Every schema is an object schema. A contract
that JSON Schema cannot represent, or that does not describe an object, makes
the server refuse to start; it never falls back to an empty schema.

**Capability discovery.** `macts__capabilities__discover` takes an `intent`
(or an exact `capability` name) and answers with the matching capabilities,
filtered by the active governance policy. It runs no operation, so it needs no
permission; calling a capability it returns does.

## Library Use

The CLI builds all of this from the pieces below; an embedder can do the same.

```typescript
import { createMcpAdapter, startStdioServer } from '@macts/mcp'
import { createBearerCredential, createRuntime, loadHostGovernance } from '@macts/runtime'

const runtime = createRuntime({ executor, governance: loadHostGovernance })
runtime.registerContract(notesContract, notesManifest)

// stdio, under the session's key
await startStdioServer({
  adapter: createMcpAdapter(runtime),
  credential: createBearerCredential(apiKey),
})
```

- `createMcpAdapter(runtime)` derives one tool per registered operation and
  runs every call as one `runtime.invoke`. It never verifies, authorizes, or
  validates anything itself.
- `withHostTools(adapter, hostTools)` serves tools that run no operation (such
  as `createDiscoveryTool(...)`) beside the operation tools, and refuses two
  tools with the same name.
- `attachMcpAdapter(server, adapter, resolveCredential)` wires an adapter into
  an MCP SDK `Server`. `resolveCredential` locates each call's credential in
  its request context: a stdio host returns the key it was started with; an
  HTTP host returns the bearer token its transport attached as
  `extra.authInfo`. Each request's abort signal cancels the operation.
- `startStdioServer({ adapter, credential })` serves an adapter over stdio.
- `createDaemon({ adapter })` serves an adapter over HTTP, verifying each
  request's bearer and carrying it to the calls that request makes.

## Troubleshooting

### Daemon Not Starting

**Symptom:** `macts mcp start` fails or daemon exits immediately.

1. **Port already in use** (TCP mode): check with `lsof -i :3000`, or use another port: `macts mcp start --port 3001`.
2. **Stale socket file** (Unix socket mode): remove `~/.macts/mcp.sock` and start again.
3. **Permission denied** on the socket directory: check `ls -la ~/.macts/`.
4. **An app fails to register:** run `macts mcp serve` in the foreground; the startup report on stderr names every app it cannot serve and why, or run `macts mcp diagnose`.

### Tools Not Appearing

Run the server in the foreground (`macts mcp serve`, or `macts --mcp` with
`MACTS_API_KEY` set) and read its startup report on stderr: it lists the apps
it serves, the apps that failed to register and why, and the apps installed
without their server package, with the command that installs it. Reinstall an
app with `macts mcp uninstall calendar && macts mcp install calendar`.

### Calls Fail

Every failure carries a structured `code`:

- `UNAUTHENTICATED`: the key is missing, malformed, expired, or revoked. Create a new one with `macts api-key create`.
- `PERMISSION_DENIED`: the key lacks the permission; `details.hint` names what to grant.
- `POLICY_DENIED`, `APPROVAL_PENDING`, `APPROVAL_REJECTED`: this Mac's governance policy stopped the call.
- `VALIDATION_FAILED`: the arguments do not match the tool's input schema; `details.issues` says where.
- `INTERNAL`: an unexpected failure on the host, including a governance policy file that cannot be read. Check the server's stderr.

### Debugging

```bash
# Use the MCP inspector
npx @modelcontextprotocol/inspector macts --mcp

# Check daemon health (TCP mode)
curl http://localhost:3000/health
```

## Related Packages

- **[@macts/runtime](../runtime/)** - The invocation pipeline every MCP call runs through
- **`@macts/<app>-server`** - An app's server package, installed with `macts mcp install <app>`: it exports the app's contract, which the MCP server serves
- **[@macts/core](../core/)** - Core macOS automation framework
- **[@macts/cli](../cli/)** - Command-line interface for macts

## Development

This package is part of the macts monorepo.

```bash
pnpm build
pnpm test
pnpm typecheck
```

## License

MIT
