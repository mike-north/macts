# macts CLI Scripts

## macts-mcp-stdio

Fast stdio adapter for connecting to the macts MCP daemon.

### Why Use This?

Benefits over direct `macts --mcp`:

- **Faster startup**: Connects to existing daemon (~10ms vs ~500ms)
- **Lower resource usage**: Single daemon process shared by multiple clients
- **Better debugging**: Automatic diagnostics on connection failure
- **Minimal latency**: Unix socket + socat provides near-zero overhead

Tradeoffs:

- Requires daemon to be running (`macts mcp start`)
- Requires `socat` for optimal performance (gracefully falls back without it)

### Prerequisites

Before using this adapter:

1. Start the daemon: `macts mcp start`
2. Install socat: `brew install socat` (macOS) or `apt install socat` (Linux)

### How it works

1. **Fast path**: Uses `socat` to connect stdio to the daemon's Unix socket
2. **Error fallback**: On any error, runs `macts mcp diagnose` for detailed diagnostics

### Dependencies

- `socat`: Install via `brew install socat` (macOS) or `apt install socat` (Linux)

### Usage

Configure Claude Desktop:

```json
{
  "mcpServers": {
    "macts": {
      "command": "macts-mcp-stdio"
    }
  }
}
```

### Environment Variables

- `MACTS_HOME`: Override default ~/.macts directory
- `MACTS_SOCKET`: Override default socket path

### Fallback Modes

If socat is not available, the script falls back to direct Node.js mode (`macts --mcp`).
This is slower but works without additional dependencies.

### Testing

Test manually:

```bash
# Start daemon first
macts mcp serve &

# Test fast path
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | macts-mcp-stdio

# Test error path (stop daemon first)
kill %1
macts-mcp-stdio  # Should run diagnostics
```

### Troubleshooting

If connection fails, the script automatically runs `macts mcp diagnose` which provides:

- Socket existence check
- Permission verification
- Daemon process status
- Recent log entries
- Recommended actions
