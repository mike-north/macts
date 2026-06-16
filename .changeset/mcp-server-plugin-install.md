---
'@macts/cli': minor
'@macts/core': patch
---

Add a first-class command to install MCP server plugins and align plugin docs with the real package names.

- `macts mcp install <app>` installs an app's MCP server plugin (`@macts/<app>-server`) into `~/.macts/plugins/` (overridable via `MACTS_HOME`), where the MCP daemon discovers it. After installing, `macts mcp start` exposes that app's tools to MCP clients. `macts mcp uninstall <app>` and `macts mcp list` round out the flow. CLI plugins (`@macts/<app>`) continue to be managed with `macts plugin install`; the CLI plugin loader still excludes `-server` packages.
- Replaced references to nonexistent `@macts/cli-*` / `@macts/mcp-*` packages across CLI help, examples, hints, and docs with the real `@macts/<app>` (CLI) and `@macts/<app>-server` (MCP) names. The package generators now default to these consolidated names.
