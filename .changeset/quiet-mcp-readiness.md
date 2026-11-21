---
'@macts/cli': patch
---

Wait up to 30 seconds for the background MCP server to become ready. Report startup errors promptly and stop a child that exceeds the readiness deadline, including its PID if shutdown cannot be confirmed. Keep startup diagnostics in mcp.log.
