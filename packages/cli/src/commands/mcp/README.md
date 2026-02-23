# MCP Daemon Management Commands

This directory contains CLI commands for managing the MCP daemon server.

## Commands

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

- Discovers and loads all installed MCP plugins
- Starts HTTP/SSE server on Unix socket or TCP port
- Runs in foreground (use Ctrl+C to stop)
- Logs output to stderr
- Returns exit code 1 if no plugins found or startup fails

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
- Reports number of loaded plugins
- Returns exit code 0 if running and healthy, 1 otherwise

**JSON Output:**

```json
{
  "running": true,
  "pid": 12345,
  "endpoint": "/Users/you/.macts/mcp.sock",
  "health": {
    "status": "ok",
    "plugins": 3
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
- Discovers and reports plugin loading status
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
      "plugins": 3
    }
  },
  "plugins": {
    "totalFound": 3,
    "totalErrors": 0,
    "plugins": [{ "packageName": "@macts/mcp-calendar", "version": "1.0.0", "tools": 5 }],
    "errors": []
  },
  "recommendations": []
}
```

## Error Handling

### No Plugins Found

If no MCP plugins are installed, `mcp serve` will fail with:

```
No MCP plugins found. Install plugins with: macts plugin install
```

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

## Integration with Fast Stdio Adapter

The `mcp diagnose` command is designed to be called automatically by the fast
stdio adapter when it encounters errors connecting to the daemon. This provides
users with actionable debugging information without manual intervention.

## Testing

Tests are located in:

- `commands.test.ts` - Command registration and basic functionality
- `serve.test.ts` - Serve command with plugin discovery mocking

Tests focus on:

- Command registration and path validation
- Option parsing
- Error handling
- Plugin discovery integration
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
- Response: `{ "status": "ok", "plugins": <count> }`
- Used by `status` and `diagnose` commands
- Connects via Unix socket or TCP

## Future Enhancements

Potential improvements:

- Log rotation for background daemon
- Systemd/launchd integration for auto-start
- Daemon restart command
- Performance metrics endpoint
- Plugin hot-reload without restart
