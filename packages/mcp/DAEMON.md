# MCP Daemon Server

The MCP daemon server provides the HTTP transports of the Model Context Protocol, allowing multiple clients to connect to a single MCP server instance. It is what `macts mcp serve` and `macts mcp start` run; for an MCP client that starts its server itself over stdio, use `macts --mcp` instead.

The daemon is a transport only. Every tool call is answered by the adapter it is given, which runs each call through a `MactsRuntime`: the caller's key is verified, its permissions are checked, governance is enforced, and the input is validated, exactly as for the HTTP API.

## Overview

The daemon server supports two listening modes:

1. **Unix Socket** (default): Fast local IPC via Unix domain socket at `~/.macts/mcp.sock`
2. **TCP Port**: HTTP on `127.0.0.1:<port>`

## Usage

### Creating a Daemon Server

```typescript
import { createDaemon, createMcpAdapter } from '@macts/mcp'
import { createRuntime, loadHostGovernance } from '@macts/runtime'

const runtime = createRuntime({ executor, governance: loadHostGovernance })
runtime.registerContract(notesContract, notesManifest)

// Create daemon with Unix socket (default)
const daemon = createDaemon({
  adapter: createMcpAdapter(runtime),
  name: 'macts-mcp-daemon',
  version: '1.0.0',
})

// Start the daemon
await daemon.start()

// Later, stop the daemon
await daemon.stop()
```

`macts mcp serve` builds the adapter the same way, from every installed app,
with the built-in capability-discovery tool served beside the operation tools.

### TCP Port Mode

```typescript
const daemon = createDaemon({
  adapter,
  port: 3000, // Listen on TCP instead of Unix socket
})

await daemon.start()
// Server now accessible at http://127.0.0.1:3000
```

### Custom Socket Path

```typescript
const daemon = createDaemon({
  adapter,
  socketPath: '/custom/path/mcp.sock',
})
```

## HTTP Endpoints

| Endpoint                               | Auth required? | Purpose                                                                                   |
| -------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `GET /health`                          | No             | Health check; always open.                                                                |
| `POST /mcp`, `GET /mcp`, `DELETE /mcp` | Yes            | Streamable HTTP transport — the current MCP transport. This is the primary HTTP endpoint. |
| `GET /sse`                             | Yes            | Legacy HTTP+SSE transport: server-to-client event stream. Deprecated but functional.      |
| `POST /message`                        | Yes            | Legacy HTTP+SSE transport: client-to-server messages.                                     |

### `GET /health`

Health check endpoint that returns server status and the number of tools served:

```bash
curl http://localhost:3000/health
# {"status":"ok","tools":42}
```

### Streamable HTTP (`/mcp`)

The current MCP transport, per the [MCP streamable HTTP spec](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http).

### Legacy SSE (`/sse` + `/message`)

The deprecated [HTTP+SSE transport](https://modelcontextprotocol.io/specification/2024-11-05/basic/transports#http-with-sse), kept for older clients. `GET /sse` establishes a persistent server-to-client event stream; `POST /message` carries client-to-server messages.

## Authentication

Every route other than `GET /health` requires a macts API key:

```
Authorization: Bearer macts_sk_...
```

Create a key with:

```bash
macts api-key create --name <name> --permission <app:resource:operation>
```

The key is checked before any MCP session is created or reached. A request
without a usable key is refused with `401`, `WWW-Authenticate: Bearer`, and the
structured error the HTTP API uses:

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

**Per-request keys.** The verified key is attached to the request as the MCP
SDK's `AuthInfo`, and the SDK hands it to the handler of every message that
request carries. Each tool call therefore runs under the key of the request
that carried it: two clients with different keys on one daemon are each
governed by their own key, and the runtime verifies the key again on every
call. There is no trusted-caller mode.

**Stdio clients.** The daemon speaks HTTP only. An MCP client that talks over
stdio starts its own server with `macts --mcp`, with its key in
`MACTS_API_KEY`:

```json
{
  "mcpServers": {
    "macts": {
      "command": "macts",
      "args": ["--mcp"],
      "env": { "MACTS_API_KEY": "macts_sk_..." }
    }
  }
}
```

## Architecture

### Connection Management

- Each MCP session gets its own MCP server instance
- Multiple clients can connect simultaneously
- Every session serves the same adapter's tools

### Tool Calls

1. The request's bearer is verified (transport authentication)
2. The bearer is attached to the request as `AuthInfo`
3. The MCP SDK routes each `tools/call` to the adapter with that `AuthInfo`
4. The adapter runs the call as one `runtime.invoke` under that bearer
5. The result, or the structured error, is returned to the requesting client

### Graceful Shutdown

The daemon handles `SIGTERM` and `SIGINT` signals:

1. Closes all active MCP server connections
2. Shuts down the HTTP server
3. Removes Unix socket file (if used)
4. Removes PID file

### PID Management

The daemon writes its process ID to `~/.macts/mcp.pid`:

- Created on startup
- Removed on shutdown
- Used for daemon management (e.g., checking if daemon is running)

## File Locations

All daemon files are stored in the macts home directory (default: `~/.macts`):

- **Socket**: `~/.macts/mcp.sock`
- **PID file**: `~/.macts/mcp.pid`

Override with `MACTS_HOME` environment variable:

```bash
export MACTS_HOME=/custom/path
# Now uses /custom/path/mcp.sock and /custom/path/mcp.pid
```

## Integration with MCP SDK

The daemon uses the official `@modelcontextprotocol/sdk`:

- **Transports**: `StreamableHTTPServerTransport` and `SSEServerTransport`
- **Server**: Low-level `Server` class, wired with `attachMcpAdapter`
- **Protocol**: Standard MCP JSON-RPC message format

## Security Considerations

### Unix Socket Security

Unix sockets inherit file system permissions. The socket file should be:

- Owned by the user running the daemon
- Not accessible to other users (unless intended)
- Located in a directory with appropriate permissions

Listening on a local socket grants nothing: every call still needs a key.

### TCP Port Security

When using TCP mode:

- Server binds to `127.0.0.1` (localhost only)
- Every route except `/health` requires a macts API key (Bearer token) — see [Authentication](#authentication)
- Use firewall rules to restrict access

## Limitations

- **Legacy transport**: SSE is one-way (server → client), requires POST for client → server
- **Scalability**: Single process, not designed for high-concurrency scenarios
- **State**: No shared state between client connections

## Future Enhancements

Potential improvements for future versions:

- WebSocket transport for bidirectional communication
- Connection pooling and rate limiting
- Metrics and monitoring endpoints
- Multi-process scaling with shared state
