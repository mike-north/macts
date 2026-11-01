# MCP Daemon Management Commands

This directory contains CLI commands for managing the MCP daemon server and the
app server packages (`@macts/<app>-server`) whose operations it serves as
tools.

## Happy Path

```bash
# 1. Install an app's server package (@macts/<app>-server) into ~/.macts/plugins/
macts mcp install calendar

# 2. (Re)start the daemon so it registers the app and serves its tools
macts mcp start

# 3. Point your MCP client at the daemon, sending a macts API key as
#    `Authorization: Bearer <key>` (create one with `macts api-key create`)
```

The install location is `~/.macts/plugins/` (override with the `MACTS_HOME`
environment variable). When it starts, the daemon registers every installed
`@macts/<app>-server` package there from its generated contract.

## Commands

### `macts mcp install`

Install an app's server package so the daemon serves its tools.

**Arguments:**

- `<app>` - App name (e.g. `calendar`) or full package name
  (e.g. `@macts/calendar-server`). An optional version suffix is supported
  (e.g. `calendar@1.0.0`).

**Options:**

- `--json` - Output result as JSON

**Usage:**

```bash
# Install by app name
macts mcp install calendar

# Install by full package name
macts mcp install @macts/calendar-server

# Install a specific version
macts mcp install calendar@1.0.0
```

**Behavior:**

- Resolves the app name to the `@macts/<app>-server` package
- Installs into `~/.macts/plugins/` via `npm install --ignore-scripts`
- Invalidates the CLI's plugin cache
- Returns exit code 0 on success, 1 on failure (invalid name, npm error)

> After installing, restart the daemon (`macts mcp start`) so it exposes the new
> tools.

### `macts mcp uninstall`

Remove an app's server package.

**Arguments:**

- `<app>` - App name or full `@macts/<app>-server` package name

**Usage:**

```bash
macts mcp uninstall calendar
```

### `macts mcp list`

List installed app server packages (the `@macts/<app>-server` packages the
daemon registers).

**Options:**

- `--json` - Output as JSON

**Usage:**

```bash
macts mcp list
```

### `macts mcp serve`

Start the MCP daemon server in the foreground. Useful for development and debugging.

**Options:**

- `--port <number>` - TCP port to listen on (instead of Unix socket)
- `--socket <path>` - Custom Unix socket path (default: `~/.macts/mcp.sock`)

**Usage:**

```bash
# Start on default Unix socket
macts mcp serve

# Start on TCP port
macts mcp serve --port 3000

# Use custom socket path
macts mcp serve --socket /tmp/my-mcp.sock
```

**Behavior:**

- Builds the runtime and registers every installed app from its generated contract, exactly as `macts --mcp` does, and serves each operation as a tool, plus the capability-discovery tool
- Reports the apps it serves, and any it cannot with the reason, on stderr
- Starts the MCP HTTP transports (streamable HTTP at `/mcp`, legacy SSE at `/sse` + `/message`) on Unix socket or TCP port
- Requires `Authorization: Bearer macts_sk_...` on every route except `GET /health`, and runs every tool call under the key of the request that carried it
- Runs in foreground (use Ctrl+C to stop)
- Logs output to stderr
- Returns exit code 1 if startup fails

### `macts mcp start`

Start the MCP daemon server in the background as a detached process.

**Options:**

- `--port <number>` - TCP port to listen on
- `--socket <path>` - Custom Unix socket path

**Usage:**

```bash
# Start in background on default socket
macts mcp start

# Start on TCP port
macts mcp start --port 3000
```

**Behavior:**

- Spawns `mcp serve` as detached background process
- Checks for existing daemon (fails if already running)
- Removes stale PID files automatically
- Writes PID to `~/.macts/mcp.pid`
- Returns exit code 0 if successful, 1 if failed

### `macts mcp stop`

Stop the running MCP daemon server.

**Usage:**

```bash
macts mcp stop
```

**Behavior:**

- Reads PID from `~/.macts/mcp.pid`
- Sends SIGTERM for graceful shutdown
- Waits up to 10 seconds for process to stop
- Force kills with SIGKILL if timeout reached
- Cleans up PID file and socket
- Returns exit code 0 if successful

### `macts mcp status`

Check the status of the MCP daemon server.

**Options:**

- `--json` - Output status as JSON

**Usage:**

```bash
# Human-readable status
macts mcp status

# JSON output
macts mcp status --json
```

**Behavior:**

- Checks if PID file exists
- Verifies process is running
- Tests health endpoint connectivity
- Reports the number of tools the daemon serves
- Returns exit code 0 if running and healthy, 1 otherwise

**JSON Output:**

```json
{
  "running": true,
  "pid": 12345,
  "endpoint": "/Users/you/.macts/mcp.sock",
  "health": {
    "status": "ok",
    "tools": 42
  }
}
```

### `macts mcp diagnose`

Comprehensive diagnostics for troubleshooting MCP server issues.

**Usage:**

```bash
macts mcp diagnose
```

**Behavior:**

- Checks daemon process status (PID file, running process)
- Checks Unix socket status (exists, permissions, connectivity)
- Loads every installed app and reports which register, which fail and why, and which are installed without their server package
- Tests health endpoint
- Generates actionable recommendations
- Always outputs JSON to stdout
- Returns exit code 0 if no issues, 1 if issues found

**Output Structure:**

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "daemon": {
    "pidFileExists": true,
    "pidFilePath": "/Users/you/.macts/mcp.pid",
    "pid": 12345,
    "processRunning": true,
    "processError": null
  },
  "socket": {
    "socketPath": "/Users/you/.macts/mcp.sock",
    "socketExists": true,
    "socketStats": {
      /* fs.Stats */
    },
    "connectionError": null,
    "healthCheck": {
      "success": true,
      "status": "ok",
      "tools": 42
    }
  },
  "apps": {
    "totalLoaded": 1,
    "totalFailed": 0,
    "apps": [{ "app": "calendar", "hostPackage": "@macts/calendar-server", "operations": 41 }],
    "failed": [],
    "missingHost": []
  },
  "recommendations": []
}
```

## Error Handling

### No Apps Installed

`mcp serve` starts even when no app is installed; it serves only the
capability-discovery tool and reports `Serving 0 app(s)` on stderr. Install an
app with `macts mcp install <app>` and restart the daemon.

### Requests Refused With 401

Every route except `GET /health` needs `Authorization: Bearer macts_sk_...`. A
request without a usable key is refused with `401` and a structured
`UNAUTHENTICATED` error whose `details.reason` says why (`missing`,
`malformed`, `invalid`, `expired`, or `revoked`). Create a key with
`macts api-key create --name <name> --permission <app:resource:operation>`.

### Port/Socket Already in Use

If the daemon fails to start due to port/socket conflict:

```
Failed to start MCP server: EADDRINUSE: address already in use
```

### Daemon Already Running

If trying to start when daemon is already running:

```
MCP server is already running (PID 12345)
Use `macts mcp stop` to stop it first.
```

### Stale PID File

The `start` and `stop` commands automatically detect and handle stale PID files
(when PID file exists but process is not running).

## Connecting a Stdio MCP Client

The daemon speaks HTTP only. An MCP client that talks over stdio starts its own
server with `macts --mcp` instead, with its key in `MACTS_API_KEY`:

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

## Testing

Tests are located in:

- `commands.test.ts` - Command registration and basic functionality
- `serve.test.ts` - Serve command, against a temporary macts home holding real installed apps

Tests focus on:

- Command registration and path validation
- Option parsing
- Error handling
- App registration from installed server packages
- JSON output structure

## Implementation Notes

### Background Process Management

The `start` command uses Node.js `child_process.spawn` with:

- `detached: true` - Allows process to continue after parent exits
- `stdio: 'ignore'` - Prevents IO from blocking
- `.unref()` - Allows parent to exit independently

### PID File Management

- PID file location: `~/.macts/mcp.pid`
- Written when daemon starts
- Removed when daemon stops
- Used to check if daemon is running

### Signal Handling

The daemon handles SIGINT and SIGTERM for graceful shutdown:

- Closes all active MCP server connections
- Shuts down HTTP server
- Removes Unix socket
- Removes PID file

### Health Check Endpoint

The daemon exposes `/health` endpoint:

- Method: GET
- Response: `{ "status": "ok", "tools": <count> }`
- Used by `status` and `diagnose` commands
- Connects via Unix socket or TCP

## Future Enhancements

Potential improvements:

- Log rotation for background daemon
- Systemd/launchd integration for auto-start
- Daemon restart command
- Performance metrics endpoint
- Registering newly installed apps without a restart
