#!/usr/bin/env bash
#
# macts-mcp-stdio - Fast stdio adapter for MCP
#
# This script provides a fast connection to the macts MCP daemon.
# On error, it falls back to detailed Node.js diagnostics.
#
# Usage: Configure Claude Desktop to use this as the MCP command.
#
# Dependencies: socat (install via: brew install socat / apt install socat)
#

set -euo pipefail

# Determine socket path (respect MACTS_HOME if set)
MACTS_HOME="${MACTS_HOME:-$HOME/.macts}"
SOCKET_PATH="${MACTS_SOCKET:-$MACTS_HOME/mcp.sock}"

# Check if socat is available
if ! command -v socat >/dev/null 2>&1; then
    echo '{"jsonrpc":"2.0","error":{"code":-32603,"message":"socat not installed. Install with: brew install socat (macOS) or apt install socat (Linux)"}}' >&2
    # Fall back to running server directly (no --mcp flag exists)
    exec macts mcp serve
fi

# Check if socket exists
if [[ ! -S "$SOCKET_PATH" ]]; then
    echo "Socket not found at $SOCKET_PATH. Running diagnostics..." >&2
    macts mcp diagnose >&2
    exit 1
fi

# Try to connect via socat
# On success: socat handles bidirectional stdio ↔ socket communication
# On failure: run diagnostics and exit
if ! socat STDIO "UNIX-CONNECT:$SOCKET_PATH" 2>/dev/null; then
    EXIT_CODE=$?

    # Exit code 141 is SIGPIPE - this is normal when the client disconnects
    if [[ $EXIT_CODE -eq 141 ]]; then
        exit 0
    fi

    echo "Connection failed (exit code: $EXIT_CODE). Running diagnostics..." >&2
    macts mcp diagnose >&2
    exit $EXIT_CODE
fi
