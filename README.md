# macts

macts turns scriptable macOS apps into secure, typed, agent-ready APIs.

It provides TypeScript SDKs, CLI commands, HTTP endpoints, and MCP tools for interacting with
native macOS applications through a local permissioned automation server. Instead of relying on
brittle UI automation, agents and developer tools can interact with real application concepts like
calendar events, reminders, files, messages, notes, tasks, projects, and windows.

Use macts to build local automations, give AI assistants scoped access to desktop apps, and create
integrations that are structured, auditable, and safe to approve.

## Why macts?

Direct UI automation — clicking, typing, reading screens — is a reasonable fallback, but it is
expensive in tokens, fragile under visual changes, and difficult to govern. macts offers a better
path for agents that need to work with macOS applications repeatedly:

- **Token-efficient**: a single typed API call replaces a multi-step observe-click-observe loop
- **Reliable**: structured app interfaces are more durable than visual layouts
- **Auditable**: every capability call can be logged with the app, resource, and operation
- **Governable**: narrow API keys let you grant exactly the access an agent needs and nothing more

## Quick Start

### 1. Install the CLI

```bash
npm install -g @macts/cli
```

### 2. Start the local API server

```bash
macts service install   # install as a background service (auto-starts on login)
macts service status    # verify it is running
```

Or start it directly for the current session:

```bash
macts --serve            # start on the default port (8372)
macts --serve --port 9000  # start on a custom port
```

This starts a local HTTP server at `http://localhost:8372` that routes calls to macOS applications.

### 3. Create a scoped API key

```bash
# Grant exactly what the example below needs (list calendars, create events)
macts api-key create --name "assistant" \
  --permission "calendar:calendars:list" \
  --permission "calendar:events:create"

# …or grant every calendar operation with a wildcard
macts api-key create --name "scheduler" --permission "calendar:*:*"
```

Save the generated token — you need it to authenticate SDK requests.

### 4. Use the SDK or MCP tools

**TypeScript SDK:**

```bash
npm install @macts/calendar
```

```typescript
import { CalendarClient } from '@macts/calendar'

const client = new CalendarClient({
  apiKey: process.env.MACTS_API_KEY!,
})

// List all calendars
const calendars = await client.calendars.list()

// Create an event
const event = await client.events.create({
  summary: 'Team Meeting',
  startDate: new Date('2026-02-17T10:00:00'),
  endDate: new Date('2026-02-17T11:00:00'),
})
```

**MCP tools (for AI assistants):**

```bash
macts mcp start    # start the local MCP daemon
```

macts exposes each app's capabilities as MCP tools through its server package (e.g.
`@macts/calendar-server`). Start the MCP daemon and point Claude Desktop or another MCP client at
the local MCP server to give it access to the calendar tools.

## AI Agent Use Cases

macts is designed to fit naturally into the way agents should use local applications.

### One-off work

For unusual, low-risk, or unlikely-to-repeat tasks, the agent can use a direct SDK call or CLI
command without any special setup.

### Existing capability

When macts already exposes the right operation, the agent should prefer it over UI automation.

Example — scheduling a meeting:

1. Check whether `calendar:events:create` permission is already granted to the active API key.
2. If not, create a key with that narrow permission.
3. Call `client.events.create(...)`.
4. Report success.

This path is faster, cheaper in tokens, and easier to verify than driving the Calendar UI directly.

### Repeated workflow

When an agent notices it is performing the same multi-app sequence repeatedly, that pattern is a
good candidate for a persistent automation (a shell script, a CLI alias, or a custom MCP tool built
on macts primitives).

### Missing capability

If macts does not yet expose the operation the agent needs, the app manifest can be extended and a
new SDK/CLI/MCP binding generated. Filing an issue or contributing a manifest entry is the
structured path to grow the available toolset.

> **Roadmap:** future releases will add `macts capabilities list/inspect` for programmatic
> discovery, and agent-assisted manifest expansion so agents can propose new capabilities directly.

## Supported Applications

### macOS System Apps

| App              | Client Package            | Server Package                   |
| ---------------- | ------------------------- | -------------------------------- |
| Calendar         | `@macts/calendar`         | `@macts/calendar-server`         |
| Contacts         | `@macts/contacts`         | `@macts/contacts-server`         |
| Finder           | `@macts/finder`           | `@macts/finder-server`           |
| Mail             | `@macts/mail`             | `@macts/mail-server`             |
| Messages         | `@macts/messages`         | `@macts/messages-server`         |
| Music            | `@macts/music`            | `@macts/music-server`            |
| Notes            | `@macts/notes`            | `@macts/notes-server`            |
| Photos           | `@macts/photos`           | `@macts/photos-server`           |
| Preview          | `@macts/preview`          | `@macts/preview-server`          |
| QuickTime Player | `@macts/quicktime-player` | `@macts/quicktime-player-server` |
| Reminders        | `@macts/reminders`        | `@macts/reminders-server`        |
| Shortcuts        | `@macts/shortcuts`        | `@macts/shortcuts-server`        |
| TV               | `@macts/tv`               | `@macts/tv-server`               |

### macOS Utilities

| App                     | Client Package                   | Server Package                          |
| ----------------------- | -------------------------------- | --------------------------------------- |
| Automator               | `@macts/automator`               | `@macts/automator-server`               |
| Bluetooth File Exchange | `@macts/bluetooth-file-exchange` | `@macts/bluetooth-file-exchange-server` |
| Console                 | `@macts/console`                 | `@macts/console-server`                 |
| Screen Sharing          | `@macts/screen-sharing`          | `@macts/screen-sharing-server`          |
| Script Editor           | `@macts/script-editor`           | `@macts/script-editor-server`           |
| System Events           | `@macts/system-events`           | `@macts/system-events-server`           |
| System Information      | `@macts/system-information`      | `@macts/system-information-server`      |
| System Settings         | `@macts/system-settings`         | `@macts/system-settings-server`         |
| Terminal                | `@macts/terminal`                | `@macts/terminal-server`                |
| TextEdit                | `@macts/textedit`                | `@macts/textedit-server`                |

### Browsers

| App            | Client Package          | Server Package                 |
| -------------- | ----------------------- | ------------------------------ |
| Arc            | `@macts/arc`            | `@macts/arc-server`            |
| Google Chrome  | `@macts/google-chrome`  | `@macts/google-chrome-server`  |
| Microsoft Edge | `@macts/microsoft-edge` | `@macts/microsoft-edge-server` |
| Safari         | `@macts/safari`         | `@macts/safari-server`         |

### Third-Party Apps

| App            | Client Package          | Server Package                 |
| -------------- | ----------------------- | ------------------------------ |
| Alfred 5       | `@macts/alfred`         | `@macts/alfred-server`         |
| iTerm          | `@macts/iterm`          | `@macts/iterm-server`          |
| Microsoft Word | `@macts/microsoft-word` | `@macts/microsoft-word-server` |
| OmniFocus      | `@macts/omnifocus`      | `@macts/omnifocus-server`      |
| OmniGraffle    | `@macts/omnigraffle`    | `@macts/omnigraffle-server`    |
| OmniPlan       | `@macts/omniplan`       | `@macts/omniplan-server`       |
| Spotify        | `@macts/spotify`        | `@macts/spotify-server`        |
| Xcode          | `@macts/xcode`          | `@macts/xcode-server`          |

### Infrastructure Packages

| Package       | Description                                   |
| ------------- | --------------------------------------------- |
| `@macts/cli`  | Command-line interface                        |
| `@macts/api`  | Local HTTP API server                         |
| `@macts/core` | Manifest schemas, code generators, app bridge |
| `@macts/mcp`  | MCP server framework and plugin loader        |

### Which package should I use?

- **Building an app or script?** Install the client package for your target app (e.g.
  `@macts/calendar`) for programmatic access via the TypeScript SDK.
- **Running quick automations?** Use `@macts/cli` for one-off command-line operations.
- **Connecting an AI assistant?** Install the server package (e.g. `@macts/calendar-server`) for
  MCP tools compatible with Claude Desktop, Copilot, or other MCP clients.

## Architecture

```
┌───────────────────────────────────────────────────────┐
│  YOUR CODE / AI AGENT                                 │
│                                                       │
│  SDK  (@macts/calendar)         ──► HTTP requests     │
│  CLI  (@macts/cli)              ──► HTTP requests     │
│  MCP  (@macts/calendar-server)  ──► HTTP requests     │
└────────────────────────┬──────────────────────────────┘
                         │ HTTP + Bearer Token
                         ▼
┌───────────────────────────────────────────────────────┐
│  LOCAL API SERVER (@macts/api)                        │
│      ├── API key validation                           │
│      ├── Permission checking (app:resource:operation) │
│      ├── Rate limiting                                │
│      └── Structured command execution                 │
└────────────────────────┬──────────────────────────────┘
                         │ native macOS automation
                         ▼
                   macOS Applications
```

All execution happens locally on your Mac. No cloud dependency is required.

## Security Model

macts uses a capability-scoped permission model designed to make the safe path also the easy path.

### Permissions follow `app:resource:operation`

Every API key is granted a set of explicit capability scopes:

```bash
# Grant only what is needed
macts api-key create --name "assistant" --permission "calendar:events:create"

# Read-only access (list/get/show are the read-type operations)
macts api-key create --name "reader" \
  --permission "calendar:calendars:list" \
  --permission "calendar:events:list" \
  --permission "calendar:events:get"

# Multiple apps, fine-grained (repeat --permission for each scope)
macts api-key create --name "scheduler" \
  --permission "calendar:events:list" \
  --permission "calendar:events:create" \
  --permission "reminders:tasks:list"
```

This is the difference between "let the AI control my computer" and "let the AI create Calendar
events." The narrower grant is easier to approve, easier to revoke, and easier to audit.

### Local-first execution

The local API server accepts connections only from `localhost` by default. No requests leave your
machine unless an app capability itself (such as Mail's send operation) involves sending data.

### Narrow defaults, explicit escalation

API keys are granted only the permissions listed at creation time. Wildcards (`*`) are matched at
request time, so a key with `calendar:*:*` matches every current or future operation on any
calendar resource (the fine-grained operations are `list`, `get`, `show`, `create`, and `delete`).
Pass `--manifest` to pre-expand a wildcard into only the explicit capabilities present in the
manifest at key-creation time. Keys can be revoked at any time:

```bash
macts api-key revoke <key-id>
```

### Sensitive operations are distinct scopes

Operations that send data, delete content, or change system state have their own operation
identifiers (`send`, `delete`, `execute`, `create` vs `read` vs `list`). You can grant read
access without granting write or delete access, or grant create without granting delete.

> **Roadmap:** planned additions include human-readable permission explanations, approval gates for
> sensitive operations, and structured audit logs.

## Requirements

- **macOS** -- macts automates native macOS applications, which are only available on macOS
- **Node.js 20+** -- Required for the API server and SDK
- **Target apps** -- Must be installed and have granted automation permissions when first prompted

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, including how to add support for new macOS
applications.

```bash
git clone https://github.com/mike-north/macts.git
cd macts
pnpm install
pnpm build
pnpm test
```

## License

MIT
