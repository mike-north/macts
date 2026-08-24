# @macts/mcp

Model Context Protocol server for macOS application automation.

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open protocol that enables AI assistants like Claude to integrate with external tools and data sources. This package provides an MCP server that exposes macOS automation capabilities to AI assistants through dynamically loaded plugins.

## Installation

This package is typically used through the `macts` CLI, which handles plugin installation and server startup.

Install an app's MCP server plugin:

```bash
macts mcp install calendar
```

This installs the `@macts/calendar-server` package into `~/.macts/plugins/`
(override the location with the `MACTS_HOME` environment variable). Installed
plugins are discovered automatically when the server starts; restart the daemon
(`macts mcp start`) after installing so it exposes the new tools.

## Quick Start

Start the MCP server:

```bash
macts --mcp
```

The server runs on stdio and communicates using the MCP protocol. It automatically discovers and loads all installed MCP plugins from `~/.macts/plugins/`.

## Daemon Server

For production use or faster startup times, run the MCP server as a daemon:

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

The daemon supports:

- **Unix socket** (default): Fast local IPC at `~/.macts/mcp.sock`
- **TCP port**: Optional HTTP/SSE server for remote access (`--port 3000`)

The daemon exposes two HTTP transports:

- **Streamable HTTP** at `/mcp` — the current MCP transport, and the primary way to talk to the daemon over HTTP.
- **Legacy SSE** at `/sse` + `/message` — the deprecated HTTP+SSE transport, kept for older clients.

See [DAEMON.md](./DAEMON.md) for complete daemon documentation.

## Authentication

The MCP server requires a valid macts API key by default, on every transport:

- **stdio** (`macts --mcp`) — validated once at startup, from the `MACTS_API_KEY` environment variable. Set it in your MCP client's `env` config (see [Integration with Claude Desktop](#integration-with-claude-desktop) below). If the key is missing or invalid, the server exits immediately with an actionable error.
- **HTTP** (`macts mcp serve` / `macts mcp start`) — every request must include `Authorization: Bearer macts_sk_...`, except `GET /health`, which is always open.

Create a key with:

```bash
macts api-key create --name <name> --permission <app:resource:operation>
```

To opt out (not recommended — only for local development or trusted embedding scenarios), pass `--disable-api-key-validation` to `macts --mcp`, `macts mcp serve`, or `macts mcp start`.

**Migration note:** if you have an existing MCP client config or daemon setup that doesn't set `MACTS_API_KEY` (or send a bearer token), it will start failing at startup/on every request until you create a key and configure it, or pass `--disable-api-key-validation`.

### Fast Stdio Adapter

For optimal performance with Claude Desktop, use `macts-mcp-stdio`:

```json
{
  "mcpServers": {
    "macts": {
      "command": "macts-mcp-stdio"
    }
  }
}
```

This adapter:

- Connects to the daemon via Unix socket using `socat` (~10ms startup)
- Automatically runs diagnostics on connection errors
- Falls back to direct Node.js mode if `socat` is unavailable

**Requirements**: Install `socat` via `brew install socat` (macOS) or `apt install socat` (Linux).

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

## Creating a Plugin

MCP plugins follow a simple structure. They are published as `@macts/<app>-server`
packages that expose an MCP plugin via the `./mcp` export. In practice these
packages are generated from an app manifest (see `@macts/core`), but a minimal
hand-written plugin looks like:

```typescript
import type { McpPlugin, McpToolDefinition } from '@macts/mcp'

/**
 * Define a tool with input/output schemas.
 */
const listCalendarsTool: McpToolDefinition = {
  name: 'macts__calendar__calendars_list',
  description: 'List all calendars from macOS Calendar.app',

  // Input schema (JSON Schema Draft 7)
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },

  // Output schema (optional but recommended for AI assistants)
  outputSchema: {
    type: 'array',
    description: 'List of calendars',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Calendar identifier' },
        name: { type: 'string', description: 'Calendar name' },
        writable: { type: 'boolean', description: 'Can be modified' },
      },
      required: ['id', 'name', 'writable'],
    },
  },

  // Handler function (with proper type casting)
  handler: async (args) => {
    // Cast args to expected type (validated by MCP server)
    const _params = args as Record<string, never> // No params for this tool

    // Call your SDK or API
    const calendars = await mySDK.calendars.list()

    // Return JSON-serializable data matching outputSchema
    return calendars.map((cal) => ({
      id: cal.id,
      name: cal.name,
      writable: cal.writable,
    }))
  },
}

/**
 * Tool with parameters.
 */
const createEventTool: McpToolDefinition = {
  name: 'macts__calendar__events_create',
  description: 'Create a new event in Calendar.app',

  inputSchema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'Event title',
      },
      startDate: {
        type: 'string',
        description: 'Start date (ISO 8601)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO 8601)',
      },
      location: {
        type: 'string',
        description: 'Event location (optional)',
      },
    },
    required: ['summary', 'startDate', 'endDate'],
    additionalProperties: false,
  },

  outputSchema: {
    type: 'object',
    properties: {
      uid: { type: 'string', description: 'Event UID' },
      summary: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
    },
    required: ['uid'],
  },

  handler: async (args) => {
    // Cast to specific input type
    const { summary, startDate, endDate, location } = args as {
      summary: string
      startDate: string
      endDate: string
      location?: string
    }

    // Create the event
    const event = await mySDK.events.create({
      summary,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      location,
    })

    // Return result matching outputSchema
    return {
      uid: event.uid,
      summary: event.summary,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
    }
  },
}

/**
 * Export the plugin.
 */
export const plugin: McpPlugin = {
  name: 'calendar',
  description: 'Calendar.app automation via MCP protocol',
  tools: [
    listCalendarsTool,
    createEventTool,
    // ... more tools
  ],
}
```

### Plugin Package Requirements

1. **Package name**: Must match `@macts/<app>-server` pattern for security
2. **Export**: Must expose the `plugin` object via the `./mcp` subpath export
3. **Installation**: Must be installed via `macts mcp install <app>`
4. **Keywords**: Add `"macts-mcp-plugin"` to `package.json` keywords for npm searchability (discovery is done by scanning installed `@macts/*-server` packages in `~/.macts/plugins/`)

### Tool Naming Convention

Tools MUST follow the pattern: `macts__<app>__<resource>_<operation>`

**Components:**

- **Namespace separator:** `__` (double underscore)
- **`<app>`:** Application name (lowercase, e.g., `calendar`)
- **`<resource>`:** Resource or scope (e.g., `calendars`, `events`, `app`)
- **`<operation>`:** Action verb (e.g., `list`, `get`, `create`, `delete`)

**Examples:**

- `macts__calendar__calendars_list` - List all calendars
- `macts__calendar__calendars_get` - Get a specific calendar
- `macts__calendar__events_create` - Create a new event
- `macts__calendar__app_reload_calendars` - Reload calendars (app-level operation)

**Why This Convention?**

- **Uniquely namespaced:** Prevents conflicts between plugins
- **Self-documenting:** Name clearly indicates functionality
- **Consistent structure:** Easy to discover and understand
- **Machine-parseable:** Tools can be grouped by app and resource

### Type Safety Best Practices

**Handler Arguments:**

```typescript
// ✅ Good: Cast to specific type
handler: async (args) => {
  const { id } = args as { id: string }
  // Now `id` has proper type checking
}

// ❌ Bad: Using `any`
handler: async (args: any) => {
  const id = args.id // No type safety!
}
```

**Return Values:**

```typescript
// ✅ Good: Return typed object matching schema
handler: async () => {
  return {
    success: true,
    message: 'Operation completed',
  }
}

// ❌ Bad: Returning non-JSON-serializable values
handler: async () => {
  return new Date() // Will be stringified incorrectly!
}
```

**Error Handling:**

```typescript
// ✅ Good: Throw errors, MCP server handles them
handler: async (args) => {
  const { id } = args as { id: string }

  const item = await myAPI.get(id)
  if (!item) {
    throw new Error(`Item not found: ${id}`)
  }

  return item
}
```

## API Reference

### Server Creation

#### `createMcpServer(plugins, options?)`

Create and start an MCP server with the given plugins.

```typescript
import { createMcpServer, type McpPlugin } from '@macts/mcp'

const plugins: McpPlugin[] = [
  /* ... */
]
await createMcpServer(plugins, {
  name: 'macts-mcp',
  version: '1.0.0',
})
```

**Parameters:**

- `plugins`: Array of MCP plugins to register
- `options`: Optional server configuration
  - `name`: Server name (appears in MCP client)
  - `version`: Server version

**Returns:** Promise that resolves when the server is running

### Plugin Discovery

#### `discoverMcpPlugins()`

Discover and load all available MCP plugins from `~/.macts/plugins/`.

```typescript
import { discoverMcpPlugins } from '@macts/mcp'

const { plugins, errors } = await discoverMcpPlugins()

console.log(`Loaded ${plugins.length} plugin(s)`)
for (const error of errors) {
  console.error(`Failed to load ${error.packageName}: ${error.message}`)
}
```

**Returns:** `Promise<PluginDiscoveryResult>`

- `plugins`: Successfully loaded plugins
- `errors`: Packages that failed to load

#### `loadMcpPlugin(packageName)`

Load a single MCP plugin by package name.

```typescript
import { loadMcpPlugin } from '@macts/mcp'

const result = await loadMcpPlugin('@macts/calendar-server')
if (result.success) {
  console.log(`Loaded: ${result.plugin.name}`)
} else {
  console.error(`Error: ${result.error}`)
}
```

**Parameters:**

- `packageName`: npm package name (e.g., `@macts/calendar-server`)

**Returns:** Result object with either `plugin` or `error`

### Plugin Cache

The MCP server uses a cache to speed up plugin discovery. The cache is automatically managed based on the lockfile hash.

#### `readMcpPluginCache()`

Read the plugin cache if valid.

```typescript
import { readMcpPluginCache } from '@macts/mcp'

const cached = readMcpPluginCache()
if (cached) {
  console.log(`Cache hit: ${cached.length} plugins`)
}
```

**Returns:** Cached plugins or `null` if cache is invalid

#### `writeMcpPluginCache(plugins)`

Write the plugin cache.

```typescript
import { writeMcpPluginCache, type CachedPlugin } from '@macts/mcp'

const plugins: CachedPlugin[] = [
  {
    packageName: '@macts/calendar-server',
    name: 'calendar',
    description: 'Calendar.app automation',
  },
]

writeMcpPluginCache(plugins)
```

#### `invalidateMcpPluginCache()`

Invalidate the plugin cache. Call this after installing or uninstalling plugins.

```typescript
import { invalidateMcpPluginCache } from '@macts/mcp'

invalidateMcpPluginCache()
```

### Types

#### `McpPlugin`

```typescript
interface McpPlugin {
  readonly name: string
  readonly description: string
  readonly tools: readonly McpToolDefinition[]
}
```

#### `McpToolDefinition`

```typescript
interface McpToolDefinition {
  readonly name: string
  readonly description: string
  readonly inputSchema: JsonSchema
  readonly handler: (args: unknown) => Promise<unknown>
}
```

#### `McpServerOptions`

```typescript
interface McpServerOptions {
  readonly name?: string
  readonly version?: string
  readonly disableApiKeyValidation?: boolean
}
```

#### `JsonSchema`

```typescript
interface JsonSchema {
  readonly type?: string
  readonly properties?: Record<string, JsonSchema>
  readonly required?: readonly string[]
  readonly items?: JsonSchema
  readonly enum?: readonly unknown[]
  readonly description?: string
  readonly [key: string]: unknown
}
```

## Troubleshooting

### Daemon Not Starting

**Symptom:** `macts mcp start` fails or daemon exits immediately.

**Possible Causes:**

1. **Port already in use** (TCP mode):

   ```bash
   # Check if port is in use
   lsof -i :3000

   # Use a different port
   macts mcp start --port 3001
   ```

2. **Socket file exists** (Unix socket mode):

   ```bash
   # Check if socket file exists
   ls -la ~/.macts/mcp.sock

   # Remove stale socket
   rm ~/.macts/mcp.sock
   macts mcp start
   ```

3. **Permission denied** (socket directory):

   ```bash
   # Check permissions
   ls -la ~/.macts/

   # Fix permissions
   chmod 755 ~/.macts/
   ```

4. **Plugin loading error:**
   ```bash
   # Check daemon logs (when running in foreground)
   macts mcp serve
   # Look for plugin load errors
   ```

### Socket Connection Errors

**Symptom:** `macts-mcp-stdio` fails to connect to daemon.

**Diagnostic Steps:**

1. **Check if daemon is running:**

   ```bash
   macts mcp status
   ```

2. **Check socket file exists:**

   ```bash
   ls -la ~/.macts/mcp.sock
   ```

3. **Test socket manually:**

   ```bash
   # Install socat if needed
   brew install socat

   # Test connection
   echo '{"jsonrpc":"2.0","id":1,"method":"ping"}' | socat - UNIX-CONNECT:$HOME/.macts/mcp.sock
   ```

4. **Check socket permissions:**
   ```bash
   ls -la ~/.macts/mcp.sock
   # Should be readable/writable by your user
   ```

**Solutions:**

- Restart daemon: `macts mcp restart`
- Use TCP mode instead: `macts mcp start --port 3000`
- Run daemon in foreground to see errors: `macts mcp serve`

### Plugin Not Loading

**Symptom:** Plugin tools not appearing in MCP client.

**Diagnostic Steps:**

1. **Verify plugin is installed:**

   ```bash
   ls ~/.macts/plugins/node_modules/@macts/
   ```

2. **Check plugin package name:**
   - Must match pattern `@macts/<app>-server`
   - Must have `macts-mcp-plugin` keyword in package.json

3. **Test plugin loading:**

   ```bash
   # Start server in foreground to see plugin load errors
   macts --mcp
   ```

4. **Check for duplicate tool names:**
   - Tool names must be unique across all plugins
   - Server will error if duplicates found

**Solutions:**

- Reinstall plugin: `macts mcp uninstall calendar && macts mcp install calendar`
- Clear plugin cache: `rm ~/.macts/plugins/.mcp-plugins-cache.json`
- Check plugin exports: Plugin must export a `plugin` object

### Tools Not Working

**Symptom:** Tool execution fails or returns errors.

**Common Issues:**

1. **Missing API key:**

   ```
   Error: MACTS_API_KEY environment variable is required
   ```

   **Solution:** Set API key in environment or MCP config:

   ```json
   {
     "mcpServers": {
       "macts": {
         "command": "macts",
         "args": ["--mcp"],
         "env": {
           "MACTS_API_KEY": "your-key-here"
         }
       }
     }
   }
   ```

2. **API server not running:**

   ```
   Error: fetch failed (ECONNREFUSED)
   ```

   **Solution:** Start the HTTP API server: `macts --serve`

3. **Permission denied:**

   ```
   Error: Permission denied: calendar:events:create
   ```

   **Solution:** Create an API key with the appropriate permission(s) (repeat `--permission` for more than one):

   ```bash
   macts api-key create --name <name> --permission calendar:events:create
   ```

4. **Invalid input:**
   ```
   Error: Invalid date format
   ```
   **Solution:** Check tool documentation for correct input format

### Performance Issues

**Symptom:** Slow startup or high latency.

**Optimizations:**

1. **Use daemon mode:**

   ```bash
   # Slower: Direct mode (starts Node.js each time)
   macts --mcp

   # Faster: Daemon mode (persistent server)
   macts mcp start
   macts-mcp-stdio  # ~10ms startup
   ```

2. **Use Unix socket instead of TCP:**

   ```bash
   # Default is Unix socket (faster)
   macts mcp start

   # TCP has higher latency
   macts mcp start --port 3000
   ```

3. **Install socat for optimal stdio adapter:**

   ```bash
   brew install socat
   # macts-mcp-stdio will automatically use socat
   ```

4. **Clear plugin cache if stale:**
   ```bash
   rm ~/.macts/.mcp-plugin-cache
   ```

### Debugging

**Enable verbose logging:**

```bash
# Set log level
export DEBUG=macts:*

# Run in foreground to see logs
macts mcp serve
```

**Test tools directly:**

```bash
# Use MCP inspector (if available)
npx @modelcontextprotocol/inspector macts --mcp

# Or test via stdio
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | macts --mcp
```

**Check server health:**

```bash
# TCP mode only
curl http://localhost:3000/health
```

## Plugin Security

For security, the MCP server only loads plugins matching the pattern `@macts/<app>-server`. This ensures that:

1. Plugins are explicitly scoped under the `@macts` organization
2. Plugin names follow a consistent convention
3. Untrusted packages cannot be loaded as plugins

If you attempt to load a plugin with an invalid name, you'll receive an error:

```
Invalid MCP plugin package name: my-plugin
```

## Related Packages

- **[@macts/calendar-server](../calendar-server/)** - MCP server plugin for Calendar.app automation
- **[@macts/core](../core/)** - Core macOS automation framework
- **[@macts/cli](../cli/)** - Command-line interface for macts

## Development

This package is part of the macts monorepo.

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

### Type Checking

```bash
pnpm typecheck
```

## License

MIT
