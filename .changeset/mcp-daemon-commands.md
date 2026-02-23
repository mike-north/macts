---
'@macts/cli': minor
'@macts/mcp': minor
---

Add MCP daemon server with HTTP/SSE transport and stdio adapter

**@macts/mcp:**

- Add HTTP/SSE daemon server for long-running MCP service
- Support Unix socket (`~/.macts/mcp.sock`) for fast local access
- Support TCP port for HTTP/SSE remote access
- PID file management for daemon lifecycle
- Graceful shutdown with SIGTERM/SIGINT handlers
- Multi-client support with isolated MCP server instances
- Tool multiplexing across all loaded plugins

**@macts/cli:**

- `macts mcp serve` - Run daemon in foreground
- `macts mcp start` - Start daemon in background
- `macts mcp stop` - Stop running daemon
- `macts mcp status` - Check daemon status (supports --json)
- `macts mcp diagnose` - Detailed diagnostics for troubleshooting
- `macts-mcp-stdio` - Fast shell script adapter using socat
  - Connects to daemon via Unix socket for minimal latency
  - Falls back to `macts mcp diagnose` on errors for detailed troubleshooting
  - Gracefully degrades to Node.js mode if socat unavailable
