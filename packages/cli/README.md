# @macts/cli

Command-line interface for macOS application automation via TypeScript-based SDKs.

## Installation

```bash
npm install -g @macts/cli
```

## Quick Start

```bash
# Start the MCP server for AI assistants
macts --mcp

# Or start the HTTP API server
macts --serve --port 3000

# Generate a TypeScript SDK from a manifest
macts generate manifests/calendar/app.yaml \
  --out-dir packages/sdk-calendar \
  --package-name @macts/sdk-calendar

# Manage API keys
macts api-key create --name "My Key" --permission "calendar:events:*"
macts api-key list

# Install a CLI plugin (adds `macts calendar ...` commands)
macts plugin install @macts/calendar

# Install an app's MCP server plugin (so the MCP daemon exposes its tools)
macts mcp install calendar
```

## Command Reference

### Server Commands

#### `macts --mcp`

Start the CLI as an MCP (Model Context Protocol) server for AI assistants.

```bash
# Start MCP server on stdio (for AI assistant integration)
macts --mcp
```

The MCP server:

- Exposes automation tools via the Model Context Protocol
- Communicates over stdio (standard input/output)
- Automatically discovers plugins from `~/.macts/plugins/`
- Logs to stderr (stdout is reserved for MCP protocol)
- Requires a valid `MACTS_API_KEY` environment variable by default; validated once at startup. Set it in your MCP client's `env` config, or create a key with `macts api-key create --name <name> --permission <app:resource:operation>`
- `--disable-api-key-validation` skips this check (not recommended — local development or trusted embedding only)

#### `macts --serve [options]`

Start the HTTP API server for remote access to macOS automation.

**Options:**

- `--port <number>` - Port number (default: 3000)
- `--tls-cert <path>` - Path to TLS certificate file (enables HTTPS)
- `--tls-key <path>` - Path to TLS private key file (requires --tls-cert)

**Examples:**

```bash
# Start on default port (3000)
macts --serve

# Start on custom port
macts --serve --port 8080

# Start with HTTPS
macts --serve --tls-cert ./cert.pem --tls-key ./key.pem
```

The server exposes these endpoints:

- `GET /health` - Health check
- `GET /api/v1` - API metadata
- `POST /api/v1/rpc/{app}.{resource}.{operation}` - RPC-style operations

### Code Generation

#### `macts generate <manifest> [options]`

Generate a complete TypeScript SDK package from a manifest file.

**Arguments:**

- `<manifest>` - Path to manifest YAML file (required)

**Options:**

- `--out-dir <path>` - Output directory for generated SDK (required)
- `--package-name <name>` - npm package name, e.g., @macts/sdk-calendar (required)
- `--version <version>` - Package version (default: 0.0.0)

**Examples:**

```bash
# Generate Calendar SDK
macts generate manifests/calendar/app.yaml \
  --out-dir packages/sdk-calendar \
  --package-name @macts/sdk-calendar

# Generate with custom version
macts generate manifests/calendar/app.yaml \
  --out-dir packages/sdk-calendar \
  --package-name @macts/sdk-calendar \
  --version 1.0.0
```

The generated SDK includes:

- TypeScript types for all resources
- Zod schemas for runtime validation
- Resource and collection classes
- Application client class
- Full JSDoc documentation

After generation:

```bash
cd packages/sdk-calendar
pnpm install
pnpm build
```

### API Key Management

API keys provide secure, fine-grained access control for the HTTP server. Keys are signed JWTs with embedded permissions.

#### `macts api-key create [options]`

Create a new API key with specified permissions.

**Options:**

- `--name <string>` - Human-readable name for the key (required)
- `--permission <string>` - Permission to grant, can be repeated (required, at least one)
- `--expires <duration>` - Expiration duration: 30d, 1h, 2w, etc. (optional)
- `--manifest <path>` - Path to manifest for permission expansion (optional)
- `--json` - Output as JSON (optional)

**Permission Format:**

Permissions follow the format: `app:resource:operation`. A grant authorizes a
call when it matches the call's required permission exactly or via a wildcard:

- **Fine-grained**: `calendar:events:list` — authorizes exactly that call.
- **Resource wildcard**: `calendar:events:*` — authorizes every operation on
  the `events` resource.
- **App wildcard**: `calendar:*:*` — authorizes every operation on every
  resource.
- **Coarse** (`read` / `create` / `write` / `delete`): `calendar:events:read` —
  _sugar_, not a standalone grant. It only authorizes calls after being
  expanded against a manifest at creation time (pass `--manifest`); it then
  resolves to the fine-grained operations it covers (for `read`, e.g.
  `calendar:events:list`, `calendar:events:get`, `calendar:events:show`).
  Creating a key with a coarse permission and **no** `--manifest` is rejected
  with a hint, because an unexpanded coarse scope authorizes nothing.

See [Wildcard & coarse semantics](#wildcard--coarse-semantics) for the full
mental model.

**Examples:**

```bash
# Create a key for all operations on calendar events (resource wildcard)
macts api-key create \
  --name "Bot" \
  --permission "calendar:events:*"

# Create a read-only key by expanding a coarse permission against the manifest
macts api-key create \
  --name "CI" \
  --permission "calendar:*:read" \
  --manifest ./manifests/calendar/app.yaml

# Create key with multiple specific permissions
macts api-key create \
  --name "Bot" \
  --permission "calendar:events:list" \
  --permission "calendar:events:create"

# Create key with expiration
macts api-key create \
  --name "Temp" \
  --permission "calendar:events:list" \
  --expires 30d

# Create key with full wildcard permissions
macts api-key create \
  --name "Admin" \
  --permission "calendar:*:*"

# Output as JSON
macts api-key create \
  --name "CI" \
  --permission "calendar:events:*" \
  --json
```

**Output:**

```
API Key: macts_sk_eyJhbGc...
Key ID: key_abc123
Name: CI
Permissions: calendar:events:list, calendar:events:get, calendar:events:show
Expires: 2026-03-19T12:00:00.000Z

Save this key securely - it cannot be retrieved later.
```

The key is displayed once and cannot be retrieved later. Store it securely.

##### Wildcard & coarse semantics

A key stores **fine-grained** permissions and an authorization check passes when
a granted permission covers the call's required `app:resource:operation`. There
are exactly two ways a granted permission covers a required one:

1. **Exact match** — granted `calendar:events:list` covers required
   `calendar:events:list`.
2. **Wildcard match** — a `*` in the granted permission's resource and/or
   operation segment matches anything in that segment:
   - `calendar:events:*` covers every operation on `events`
     (`calendar:events:list`, `calendar:events:create`, …).
   - `calendar:*:list` covers `list` on every resource.
   - `calendar:*:*` covers every call for the app.

The app segment must always match exactly. There is **no** implicit grouping:
`calendar:events:list` does **not** cover `calendar:events:get`. To authorize a
set of operations, use a wildcard or list the fine-grained permissions.

**Coarse operations are not a third matching rule.** `read` / `create` /
`write` / `delete` are authoring sugar, expanded into fine-grained permissions
**at key creation** against a manifest. They never participate in matching:

- `--permission calendar:events:read --manifest <path>` stores the fine-grained
  operations the manifest's `permissions` section lists under `events.read`
  (e.g. `calendar:events:list`, `calendar:events:get`, `calendar:events:show`).
- `--permission calendar:events:read` **without** `--manifest` is rejected,
  because an unexpanded coarse scope would authorize nothing. The error names
  the wildcard (`calendar:events:*`) and a fine-grained example to use instead.

**When a call is denied**, the error names the exact required permission and the
resource wildcard that would also authorize it, so the fix is a single grant:

```
Missing required permission "calendar:events:create". Grant
"calendar:events:create" (or the resource wildcard "calendar:events:*") to
authorize this call.
```

Use `macts permissions expand "<coarse>" --manifest <path>` to preview what a
coarse or wildcard permission resolves to before creating a key.

#### `macts api-key list [options]`

List all API keys created on this machine.

**Options:**

- `--include-revoked` - Include revoked keys in output (default: false)
- `--json` - Output as JSON (optional)

**Examples:**

```bash
# List active keys
macts api-key list

# List all keys including revoked
macts api-key list --include-revoked

# Output as JSON
macts api-key list --json
```

**Output:**

```
ID                   Name        Prefix      Created     Expires     Status
key_abc123           CI          macts_sk_   2026-02-17  2026-03-19  active
key_def456           Bot         macts_sk_   2026-02-16  -           active
```

Note: The actual key tokens are not stored and cannot be retrieved. Only metadata is shown.

#### `macts api-key revoke <key-id-or-token> [options]`

Revoke an API key, making it invalid for future use.

**Arguments:**

- `<key-id-or-token>` - Key ID (e.g., key_abc123) or full token (required)

**Options:**

- `--json` - Output as JSON (optional)

**Examples:**

```bash
# Revoke by key ID
macts api-key revoke key_abc123

# Revoke by full token
macts api-key revoke macts_sk_eyJhbGc...

# Output as JSON
macts api-key revoke key_abc123 --json
```

Revoked keys remain in the list but cannot be used for authentication.

#### `macts api-key verify <token> [options]`

Verify an API key's signature and expiration, then display its permissions.

**Arguments:**

- `<token>` - Full API key token to verify (required)

**Options:**

- `--json` - Output as JSON (optional)

**Examples:**

```bash
# Verify a key
macts api-key verify macts_sk_eyJhbGc...

# Output as JSON
macts api-key verify macts_sk_eyJhbGc... --json
```

**Output:**

```
Key is valid

Key ID: key_abc123
Name: CI
Issued: 2026-02-17T10:00:00.000Z
Expires: 2026-03-19T12:00:00.000Z

Permissions:
  - calendar:events:list
  - calendar:events:show
  - calendar:events:count
```

Useful for debugging access issues or inspecting key contents.

### MCP Daemon Management

The MCP daemon runs as a background HTTP server over Unix sockets (or TCP), allowing multiple clients to share a single MCP instance. By default, every route except `GET /health` requires a valid `macts_sk_` API key as a `Bearer` token.

#### `mcp serve [options]`

Start the MCP server in the foreground (for development/debugging).

**Options:**

- `--port <number>` - TCP port to listen on (optional)
- `--socket <path>` - Unix socket path (default: ~/.macts/mcp.sock)
- `--disable-api-key-validation` - Skip API key validation on all daemon routes (not recommended)

**Examples:**

```bash
# Start on default Unix socket
macts mcp serve

# Start on TCP port
macts mcp serve --port 3000

# Use custom socket path
macts mcp serve --socket /tmp/custom.sock

# Start without API key validation (not recommended)
macts mcp serve --disable-api-key-validation
```

The server will:

- Load all installed MCP plugins
- Listen on the specified socket or port
- Handle MCP protocol requests over streamable HTTP (`/mcp`) and legacy SSE (`/sse` + `/message`)
- Require `Authorization: Bearer macts_sk_...` on every route except `/health`, unless `--disable-api-key-validation` is passed
- Log whether API key validation is enabled or disabled to stderr on startup
- Display logs to stderr

Press Ctrl+C to stop the server.

#### `mcp start [options]`

Start the MCP server in the background as a detached process.

**Options:**

- `--port <number>` - TCP port to listen on (optional)
- `--socket <path>` - Unix socket path (default: ~/.macts/mcp.sock)
- `--disable-api-key-validation` - Skip API key validation on all daemon routes (not recommended)

**Examples:**

```bash
# Start on default Unix socket
macts mcp start

# Start on TCP port
macts mcp start --port 3000

# Use custom socket path
macts mcp start --socket /tmp/custom.sock

# Start without API key validation (not recommended)
macts mcp start --disable-api-key-validation
```

The server will:

- Run detached from the terminal
- Continue running after the terminal closes
- Write logs to `~/.macts/mcp.log`
- Store its PID in `~/.macts/mcp.pid`
- Forward `--disable-api-key-validation` to the spawned `mcp serve` process, when passed

Use `macts mcp stop` to stop the server.

#### `mcp stop`

Stop the MCP daemon server running in the background.

```bash
macts mcp stop
```

This will:

- Read the PID from `~/.macts/mcp.pid`
- Send SIGTERM for graceful shutdown
- Wait up to 10 seconds for the process to stop
- Force kill with SIGKILL if needed

#### `mcp status [options]`

Check if the MCP daemon is running and responding.

**Options:**

- `--json` - Output as JSON (optional)

**Examples:**

```bash
# Check status
macts mcp status

# Output as JSON
macts mcp status --json
```

**Output:**

```
MCP server is running
PID: 12345
Endpoint: /Users/username/.macts/mcp.sock
Plugins: 2
Status: healthy
```

Exit codes:

- `0` - Server is running and healthy
- `1` - Server is not running or unhealthy

#### `mcp diagnose`

Diagnose MCP server issues and provide troubleshooting recommendations.

```bash
macts mcp diagnose
```

This command checks:

- Daemon process status (PID file, running process)
- Unix socket status (exists, permissions, connectivity)
- Plugin discovery (loaded plugins, errors)
- Health endpoint (connectivity, response)

**Output:**

The command outputs a detailed JSON diagnostic report including:

- Timestamp
- Daemon status (PID, process running)
- Socket status (path, existence, connectivity)
- Plugin status (count, load errors)
- Recommendations for fixing issues

**Example output:**

```json
{
  "timestamp": "2026-02-17T12:00:00.000Z",
  "daemon": {
    "pidFileExists": true,
    "pid": 12345,
    "processRunning": true
  },
  "socket": {
    "socketPath": "/Users/username/.macts/mcp.sock",
    "socketExists": true,
    "healthCheck": {
      "success": true,
      "plugins": 2
    }
  },
  "plugins": {
    "totalFound": 2,
    "totalErrors": 0,
    "plugins": [{ "name": "calendar", "tools": 5 }]
  },
  "recommendations": []
}
```

This command is automatically invoked by the MCP stdio adapter when connection errors occur.

Exit codes:

- `0` - No issues found
- `1` - Issues found (see recommendations)

### Plugin Management

Plugins extend macts with capabilities for specific macOS applications. They are
installed to `~/.macts/plugins/` (override with the `MACTS_HOME` environment
variable) and discovered automatically. There are two kinds:

- **CLI plugins** — published as `@macts/<app>` (SDK + CLI commands). Installed
  with `macts plugin install` and discovered by the CLI, adding
  `macts <app> ...` commands.
- **MCP server plugins** — published as `@macts/<app>-server` (HTTP API + MCP
  plugin). Installed with [`macts mcp install`](#macts-mcp-install) and
  discovered by the MCP daemon, exposing the app's tools to MCP clients.

#### `plugin install <package> [options]`

Install a CLI plugin from npm.

**Arguments:**

- `<package>` - npm package name, optionally with version (required)

**Options:**

- `--json` - Output as JSON (optional)

**Examples:**

```bash
# Install the calendar plugin
macts plugin install @macts/calendar

# Install a specific version
macts plugin install @macts/calendar@1.0.0

# Output as JSON
macts plugin install @macts/calendar --json
```

CLI plugins must be scoped under `@macts/<app>` for security. To install an
app's MCP server plugin instead, use `macts mcp install <app>`.

#### `plugin list [options]`

List all installed CLI plugins.

**Options:**

- `--json` - Output as JSON (optional)

**Examples:**

```bash
# List plugins
macts plugin list

# Output as JSON
macts plugin list --json
```

**Output:**

```
Package            Version
@macts/calendar    1.0.0
```

#### `plugin uninstall <package> [options]`

Uninstall a CLI plugin.

**Arguments:**

- `<package>` - npm package name (required)

**Options:**

- `--json` - Output as JSON (optional)

**Examples:**

```bash
# Uninstall the calendar plugin
macts plugin uninstall @macts/calendar

# Output as JSON
macts plugin uninstall @macts/calendar --json
```

### MCP Server Plugin Management

MCP server plugins (`@macts/<app>-server`) expose an app's tools to MCP clients
through the MCP daemon. They are installed into the same `~/.macts/plugins/`
directory as CLI plugins and discovered automatically by `macts mcp start`.

#### `macts mcp install <app> [options]`

Install an app's MCP server plugin.

**Arguments:**

- `<app>` - App name (e.g. `calendar`) or full package name
  (e.g. `@macts/calendar-server`), optionally with a version suffix
  (e.g. `calendar@1.0.0`) (required)

**Options:**

- `--json` - Output as JSON (optional)

**Examples:**

```bash
# Install by app name
macts mcp install calendar

# Install by full package name
macts mcp install @macts/calendar-server

# Install a specific version
macts mcp install calendar@1.0.0
```

After installing, restart the daemon so it exposes the new tools:

```bash
macts mcp start
```

#### `macts mcp uninstall <app> [options]`

Remove an app's MCP server plugin.

```bash
macts mcp uninstall calendar
```

#### `macts mcp list [options]`

List installed MCP server plugins.

```bash
macts mcp list
```

### Permissions Commands

Permissions commands help you explore and understand the permission model defined in manifests.

#### `permissions list [options]`

List all permissions for an app defined in a manifest.

**Options:**

- `--manifest <path>` - Path to manifest file (required)
- `--json` - Output as JSON (optional)

**Examples:**

```bash
# List calendar permissions
macts permissions list --manifest ./manifests/calendar/app.yaml

# Output as JSON
macts permissions list --manifest ./manifest.yaml --json
```

**Output:**

```
Permissions for Calendar
========================================

Coarse Permissions:
  calendar:events:read
    → calendar:events:list
    → calendar:events:show
    → calendar:events:count
  calendar:events:write
    → calendar:events:create
    → calendar:events:update
    → calendar:events:delete

Fine-grained Permissions:
  calendar:events:count
  calendar:events:create
  calendar:events:delete
  calendar:events:list
  calendar:events:show
  calendar:events:update

Summary:
  Coarse permissions: 2
  Fine-grained permissions: 6
```

#### `permissions expand <permission> [options]`

Expand a coarse or wildcard permission to its fine-grained equivalents.

**Arguments:**

- `<permission>` - Permission to expand (required)

**Options:**

- `--manifest <path>` - Path to manifest file (required)
- `--json` - Output as JSON (optional)

**Examples:**

```bash
# Expand a coarse permission
macts permissions expand "calendar:events:read" \
  --manifest ./manifests/calendar/app.yaml

# Expand a wildcard permission
macts permissions expand "calendar:*:read" \
  --manifest ./manifests/calendar/app.yaml

# Output as JSON
macts permissions expand "calendar:events:read" \
  --manifest ./manifest.yaml \
  --json
```

**Output:**

```
calendar:events:read expands to:
  - calendar:events:count
  - calendar:events:list
  - calendar:events:show

Total: 3 permission(s)
```

This shows what happens when you create an API key with a coarse permission.

### Service Management (macOS launchd)

Service commands manage the macts server as a macOS launchd agent that starts automatically at login.

#### `service install [options]`

Install macts as a launchd service.

**Options:**

- `--port <number>` - TCP port for the service to listen on (optional)

**Examples:**

```bash
# Install with defaults
macts service install

# Install on a specific port
macts service install --port 3000
```

This will:

- Generate a launchd plist configuration
- Write it to `~/Library/LaunchAgents/com.macts.server.plist`
- Load the service via launchctl

The service will start automatically at login.

#### `service uninstall`

Uninstall the macts launchd service.

```bash
macts service uninstall
```

This will:

- Unload the service via launchctl
- Remove the plist file from `~/Library/LaunchAgents/`

The service will no longer start automatically at login.

#### `service status`

Check the status of the macts launchd service.

```bash
macts service status
```

**Output:**

```
Service running (PID 12345)
```

Reports:

- Not installed (no plist file)
- Running (with PID)
- Stopped (loaded but not running)

### Help and Version

#### `macts --help`

Show general help or help for a specific command.

```bash
# Show general help
macts --help

# Show help for a specific command
macts api-key create --help
macts mcp start --help
```

#### `macts --version`

Show the installed version of macts.

```bash
macts --version
```

## Environment Variables

The CLI respects the following environment variables:

| Variable               | Description                                                 | Default          |
| ---------------------- | ----------------------------------------------------------- | ---------------- |
| `MACTS_HOME`           | Base directory for macts configuration and plugins          | `~/.macts`       |
| `HOME`                 | User home directory (used for default paths)                | (system)         |
| `MACTS_API_KEY_SECRET` | Secret key for signing API keys (auto-generated if not set) | (auto-generated) |
| `LOG_LEVEL`            | Logging verbosity: debug, info, warn, error                 | `info`           |
| `NODE_ENV`             | Node environment: development, production                   | `development`    |

**Examples:**

```bash
# Use custom macts home directory
MACTS_HOME=/custom/path macts plugin list

# Set explicit API key signing secret
export MACTS_API_KEY_SECRET=your-secret-key-here
macts api-key create --name "CI" --permission "calendar:events:*"

# Enable debug logging
LOG_LEVEL=debug macts mcp serve
```

## Configuration

macts stores its configuration and data in `~/.macts/` (or `$MACTS_HOME`):

```
~/.macts/
├── plugins/                    # Installed plugins
│   ├── package.json            # Plugin dependencies
│   ├── package-lock.json       # Lockfile
│   ├── node_modules/           # Plugin packages
│   └── .plugins-cache.json     # Plugin discovery cache
├── keys/                       # API key metadata
│   ├── key_abc123.json         # Key metadata (no secret)
│   └── .api-key-secret         # Signing secret (auto-generated)
├── mcp.sock                    # MCP daemon Unix socket
├── mcp.pid                     # MCP daemon process ID
├── mcp.log                     # MCP daemon logs
└── logs/                       # Service logs
    ├── stdout.log              # Service standard output
    └── stderr.log              # Service standard error
```

**Security Notes:**

- API key metadata files contain no secrets (only permissions, dates)
- The signing secret in `.api-key-secret` should be kept secure
- Generated API key tokens (`macts_sk_...`) should be stored securely by the user
- Keys are signed JWTs that can be validated without database lookups

## Output Formats

All commands support `--json` flag for machine-readable output:

```bash
# Human-readable (default)
macts api-key list

# JSON output
macts api-key list --json
```

Human-readable output includes:

- Color-coded success/error messages
- Formatted tables for list views
- Clear error messages with suggestions

JSON output provides:

- Structured data for scripting
- Consistent schema across commands
- Suitable for parsing with `jq` or similar tools

## Plugin System

macts uses a plugin architecture to extend functionality. There are three types of plugins:

| Type         | Keyword             | Purpose                                               |
| ------------ | ------------------- | ----------------------------------------------------- |
| CLI plugins  | `macts-cli-plugin`  | Add CLI commands (e.g., `macts calendar events list`) |
| MCP plugins  | `macts-mcp-plugin`  | Add MCP tools for AI assistants                       |
| HTTP plugins | `macts-http-plugin` | Add HTTP endpoints (future)                           |

### Available Plugins

| Plugin                   | Type | Description                          |
| ------------------------ | ---- | ------------------------------------ |
| `@macts/calendar`        | CLI  | Calendar.app automation commands     |
| `@macts/calendar-server` | MCP  | Calendar.app tools for AI assistants |

### Creating CLI Plugins

CLI plugins are npm packages that:

1. Are scoped under `@macts/<app>` (the consolidated client package; MCP server
   plugins use the `@macts/<app>-server` name instead)
2. Include `macts-cli-plugin` in package.json keywords
3. Export a `plugin` object conforming to the `CliPlugin` interface

**Example plugin (`@macts/myapp`):**

```typescript
// src/index.ts
import type { CliPlugin } from '@macts/cli'
import { Command } from 'clipanion'

class MyAppListCommand extends Command {
  static paths = [['myapp', 'list']]

  static usage = Command.Usage({
    description: 'List items from MyApp',
  })

  async execute(): Promise<number> {
    this.context.stdout.write('Listing items...\n')
    // Your automation logic here
    return 0
  }
}

export const plugin: CliPlugin = {
  name: 'myapp',
  description: 'MyApp automation commands',
  commands: [MyAppListCommand],
}
```

**Plugin package.json:**

```json
{
  "name": "@macts/myapp",
  "version": "1.0.0",
  "type": "module",
  "keywords": ["macts", "macts-cli-plugin"],
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

**Installation:**

```bash
macts plugin install @macts/myapp
```

**Usage:**

```bash
macts myapp list
macts myapp --help
```

Plugins are discovered automatically from `~/.macts/plugins/node_modules/` on CLI startup.

### Using Formatters in Plugins

Plugins can use the output formatter system for consistent output:

```typescript
import { createFormatter } from '@macts/cli'
import { Command, Option } from 'clipanion'

class MyCommand extends Command {
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    // Format success
    this.context.stdout.write(formatter.formatSuccess('Operation completed!') + '\n')

    // Format error
    this.context.stderr.write(formatter.formatError('Something went wrong') + '\n')

    // Format structured data
    const data = { id: '123', name: 'Example' }
    this.context.stdout.write(formatter.format(data) + '\n')

    // Format tables
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ]
    this.context.stdout.write(
      formatter.formatList(items, {
        columns: [
          { header: 'ID', key: 'id' },
          { header: 'Name', key: 'name' },
        ],
      }) + '\n'
    )

    return 0
  }
}
```

## Troubleshooting

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use`

**Solution:**

```bash
# Find the process using the port
lsof -i :3000

# Kill the process or use a different port
macts --serve --port 8080
```

### Permission Denied

**Error:** `EACCES: permission denied`

**Solutions:**

- Check file permissions on `~/.macts/` directory
- Ensure you have write access to the output directory
- Don't run with `sudo` (macts operates in user space)

```bash
# Fix permissions
chmod -R u+w ~/.macts/
```

### TLS Certificate Errors

**Error:** `Failed to start HTTP server: unable to get local issuer certificate`

**Solutions:**

- Verify certificate and key files exist and are readable
- Ensure certificate and key match
- Use absolute paths for `--tls-cert` and `--tls-key`
- Check certificate validity: `openssl x509 -in cert.pem -text -noout`

```bash
# Generate self-signed certificate for testing
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout key.pem -out cert.pem -days 365
```

### API Key Issues

**Invalid key format:**

```bash
# Verify key format (should start with macts_sk_)
macts api-key verify <your-key>
```

**Key expired:**

```bash
# Check key expiration
macts api-key verify <your-key>

# Create new key with longer expiration
macts api-key create --name "New" --permission "calendar:*:*" --expires 365d
```

**Insufficient permissions:**

```bash
# Check what permissions a key has
macts api-key verify <your-key>

# Create key with needed permissions
macts api-key create --name "Admin" --permission "calendar:*:*"
```

### MCP Daemon Issues

**Daemon won't start:**

```bash
# Run diagnostics
macts mcp diagnose

# Check logs
cat ~/.macts/mcp.log

# Manually start in foreground to see errors
macts mcp serve
```

**Stale PID file:**

```bash
# Clean up stale PID file
macts mcp stop

# Verify it's clean
macts mcp status

# Start fresh
macts mcp start
```

**Socket connection refused:**

```bash
# Check if socket exists
ls -la ~/.macts/mcp.sock

# Remove stale socket
rm ~/.macts/mcp.sock

# Restart daemon
macts mcp stop && macts mcp start
```

**No plugins loaded:**

```bash
# Check installed MCP server plugins
macts mcp list

# Install an app's MCP server plugin
macts mcp install calendar

# Restart daemon to reload plugins
macts mcp stop && macts mcp start
```

### Plugin Installation Issues

**Package not found:**

- Verify package name spelling
- Check that package is published to npm
- Ensure CLI plugins are scoped under `@macts/<app>` and MCP server plugins
  under `@macts/<app>-server`

**Plugin won't load:**

```bash
# Check plugin cache
cat ~/.macts/plugins/.plugins-cache.json

# Clear cache (forces plugin rediscovery)
rm ~/.macts/plugins/.plugins-cache.json

# Reinstall a CLI plugin
macts plugin uninstall @macts/calendar
macts plugin install @macts/calendar

# Reinstall an MCP server plugin
macts mcp uninstall calendar
macts mcp install calendar
```

### Manifest Errors

**Manifest not found:**

```bash
# Use absolute path
macts generate /absolute/path/to/manifest.yaml --out-dir ./output --package-name @macts/sdk-test

# Or ensure you're in the correct directory
pwd
ls manifests/
```

**Invalid manifest format:**

- Validate YAML syntax
- Check manifest schema version
- Review error messages for specific validation failures

### General Debugging

Enable debug logging for more information:

```bash
LOG_LEVEL=debug macts <command>
```

Check version compatibility:

```bash
macts --version
node --version  # Requires Node.js >= 20
```

## Programmatic API

The CLI package exports utilities for plugin development and scripting:

```typescript
import {
  // Version info
  VERSION,

  // Commands (can be extended)
  GenerateCommand,
  RootCommand,

  // Plugin system
  type CliPlugin,
  type PluginDiscoveryResult,
  type PluginLoadError,
  type PluginRegistrationResult,
  discoverPlugins,
  loadPlugin,
  registerPlugin,
  registerAllPlugins,

  // Output formatters
  type OutputFormatter,
  type TableColumn,
  type TableOptions,
  createFormatter,
  JsonFormatter,
  HumanFormatter,
} from '@macts/cli'
```

### Output Formatters

```typescript
import { createFormatter } from '@macts/cli'

// Create formatter based on output mode
const formatter = createFormatter(jsonMode)

// Format single object
const output = formatter.format({ id: '123', name: 'Example' })

// Format list as table
const table = formatter.formatList(
  [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ],
  {
    columns: [
      { header: 'ID', key: 'id', maxWidth: 10 },
      { header: 'Name', key: 'name', maxWidth: 20 },
    ],
  }
)

// Format messages
const success = formatter.formatSuccess('Operation completed')
const error = formatter.formatError('Something failed')
```

### Plugin Discovery

```typescript
import { discoverPlugins, loadPlugin } from '@macts/cli'

// Discover all plugins
const { plugins, errors } = await discoverPlugins()

console.log(`Found ${plugins.length} plugins`)
for (const error of errors) {
  console.error(`Failed to load ${error.packageName}: ${error.message}`)
}

// Load specific plugin
const plugin = await loadPlugin('@macts/calendar')
```

### Plugin Registration

```typescript
import { Cli } from 'clipanion'
import { registerPlugin, registerAllPlugins } from '@macts/cli'

const cli = new Cli()

// Register single plugin
registerPlugin(cli, plugin)

// Register all discovered plugins
const { plugins } = await discoverPlugins()
const result = registerAllPlugins(cli, { plugins, errors: [] })

console.log(`Registered ${result.commandsRegistered} commands`)
console.log(`Errors: ${result.registrationErrors.length}`)
```

## License

MIT
