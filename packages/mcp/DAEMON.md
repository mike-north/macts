# MCP Daemon Server

The MCP daemon server provides HTTP/SSE transport for the Model Context Protocol, allowing multiple clients to connect to a single MCP server instance over the network.

## Overview

The daemon server supports two transport modes:

1. **Unix Socket** (default): Fast local IPC via Unix domain socket at `~/.macts/mcp.sock`
2. **TCP Port**: Optional HTTP server for remote or testing access

## Usage

### Creating a Daemon Server

```typescript
import { createDaemon, discoverMcpPlugins } from '@macts/mcp'

// Discover and load plugins
const plugins = await discoverMcpPlugins()

// Create daemon with Unix socket (default)
const daemon = createDaemon({
  plugins,
  name: 'macts-mcp-daemon',
  version: '1.0.0',
})

// Start the daemon
await daemon.start()

// Later, stop the daemon
await daemon.stop()
```

### TCP Port Mode

For remote access or testing, specify a port:

```typescript
const daemon = createDaemon({
  plugins,
  port: 3000, // Listen on TCP instead of Unix socket
})

await daemon.start()
// Server now accessible at http://localhost:3000
```

### Custom Socket Path

Override the default Unix socket path:

```typescript
const daemon = createDaemon({
  plugins,
  socketPath: '/custom/path/mcp.sock',
})
```

## HTTP Endpoints

| Endpoint                               | Auth required? | Purpose                                                                                   |
| -------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `GET /health`                          | No             | Health check; always open, even with API key validation enabled.                          |
| `POST /mcp`, `GET /mcp`, `DELETE /mcp` | Yes            | Streamable HTTP transport — the current MCP transport. This is the primary HTTP endpoint. |
| `GET /sse`                             | Yes            | Legacy HTTP+SSE transport: server-to-client event stream. Deprecated but functional.      |
| `POST /message`                        | Yes            | Legacy HTTP+SSE transport: client-to-server messages.                                     |

### `GET /health`

Health check endpoint that returns server status:

```bash
curl http://localhost:3000/health
# {"status":"ok","plugins":2}
```

### Streamable HTTP (`/mcp`)

The current MCP transport, per the [MCP streamable HTTP spec](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http). Requires `Authorization: Bearer macts_sk_...` unless the daemon was started with `--disable-api-key-validation`.

### Legacy SSE (`/sse` + `/message`)

The deprecated [HTTP+SSE transport](https://modelcontextprotocol.io/specification/2024-11-05/basic/transports#http-with-sse), kept for older clients. `GET /sse` establishes a persistent server-to-client event stream; `POST /message` carries client-to-server messages. Both require the same bearer-token authentication as `/mcp`.

## Authentication

Every route other than `GET /health` requires a valid macts API key by default:

```
Authorization: Bearer macts_sk_...
```

Create a key with:

```bash
macts api-key create --name <name> --permission <app:resource:operation>
```

Requests without a valid `Authorization` header receive a `401` with a JSON error body. Pass `--disable-api-key-validation` to `macts mcp serve` / `macts mcp start` to skip this check entirely (not recommended — only for local development or trusted embedding scenarios).

**`macts-mcp-stdio` caveat:** the socat-based stdio bridge (`packages/cli/scripts/macts-mcp-stdio.sh`) connects directly to the daemon's Unix socket and sends no HTTP headers at all — it cannot inject an `Authorization` header. Against an auth-enabled daemon, its requests fail with `401`. Until per-connection header injection is added (future work), run the daemon with `--disable-api-key-validation` if you're bridging to it via `macts-mcp-stdio`.

## Architecture

### Connection Management

- Each SSE connection creates a new MCP server instance
- Multiple clients can connect simultaneously
- Each connection is isolated with its own server instance
- All connections share the same plugin registry

### Tool Routing

All plugins are registered when the daemon starts:

1. Tool names are validated (must be unique across all plugins)
2. Tools are registered in a shared handler map
3. Incoming tool calls are routed to the correct handler
4. Results are returned via SSE to the requesting client

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

- **Transport**: `SSEServerTransport` for HTTP/SSE communication
- **Server**: Low-level `Server` class for request handling
- **Protocol**: Standard MCP JSON-RPC message format

## Testing

Due to sandbox restrictions in the test environment, the daemon tests focus on:

- Initialization and configuration
- Tool registration and validation
- API surface and type safety

For full integration testing (network operations), run tests outside the sandbox:

```bash
NODE_ENV=test pnpm test
```

## Example: CLI Integration

The daemon can be used to provide MCP access for command-line tools:

```typescript
#!/usr/bin/env node
import { createDaemon, discoverMcpPlugins } from '@macts/mcp'

async function main() {
  const plugins = await discoverMcpPlugins()
  const daemon = createDaemon({ plugins })

  await daemon.start()
  console.log('MCP daemon started on ~/.macts/mcp.sock')

  // Keep running until interrupted
  await new Promise(() => {})
}

main().catch(console.error)
```

## Security Considerations

### Unix Socket Security

Unix sockets inherit file system permissions. The socket file should be:

- Owned by the user running the daemon
- Not accessible to other users (unless intended)
- Located in a directory with appropriate permissions

### TCP Port Security

When using TCP mode:

- Server binds to `127.0.0.1` (localhost only) by default
- Suitable for local development and testing
- Every route except `/health` requires a valid `macts_sk_` API key (Bearer token) by default — see [Authentication](#authentication)
- Use firewall rules to restrict access

## Limitations

- **Legacy transport**: SSE is one-way (server → client), requires POST for client → server
- **Scalability**: Single process, not designed for high-concurrency scenarios
- **State**: No shared state between client connections
- **Authentication**: Bearer-token API key validation on every route except `/health`; no per-connection header injection for the `macts-mcp-stdio` socat bridge (see caveat above)

## Future Enhancements

Potential improvements for future versions:

- WebSocket transport for bidirectional communication
- Per-connection header injection for the `macts-mcp-stdio` bridge, so it can carry a bearer token
- Connection pooling and rate limiting
- Metrics and monitoring endpoints
- Multi-process scaling with shared state
