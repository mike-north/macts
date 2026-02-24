# macts

TypeScript SDKs for macOS app automation -- control Calendar, Reminders, OmniFocus, Xcode, and 30+ other native macOS applications from your code.

## What is macts?

macts (macOS Automation Control TypeScript SDKs) lets you programmatically interact with macOS applications. It provides:

- **Type-safe APIs** -- Full TypeScript support with autocomplete and type checking
- **HTTP-based architecture** -- A local API server handles JXA/AppleScript execution securely
- **Multiple interfaces** -- Use via SDK, CLI, or MCP (Model Context Protocol) for AI assistants
- **Manifest-driven** -- App interfaces are defined in YAML manifests, with packages generated automatically

## Quick Start

### 1. Install the CLI

```bash
npm install -g @macts/cli
```

### 2. Start the API server

```bash
macts api start
```

This starts a local HTTP server (default: `http://localhost:8372`) that executes commands against macOS applications.

### 3. Create an API key

```bash
macts api-key create --name "my-app" --permissions "calendar:*"
```

Save the generated API key -- you'll need it to authenticate SDK requests.

### 4. Use the SDK

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
console.log('Your calendars:', calendars)

// Create an event
const event = await client.events.create({
  summary: 'Team Meeting',
  startDate: new Date('2026-02-17T10:00:00'),
  endDate: new Date('2026-02-17T11:00:00'),
})
console.log('Created event:', event.uid)
```

## Supported Applications

### macOS System Apps

| App | Client Package | Server Package |
|-----|---------------|----------------|
| Calendar | `@macts/calendar` | `@macts/calendar-server` |
| Contacts | `@macts/contacts` | `@macts/contacts-server` |
| Finder | `@macts/finder` | `@macts/finder-server` |
| Mail | `@macts/mail` | `@macts/mail-server` |
| Messages | `@macts/messages` | `@macts/messages-server` |
| Music | `@macts/music` | `@macts/music-server` |
| Notes | `@macts/notes` | `@macts/notes-server` |
| Photos | `@macts/photos` | `@macts/photos-server` |
| Preview | `@macts/preview` | `@macts/preview-server` |
| QuickTime Player | `@macts/quicktime-player` | `@macts/quicktime-player-server` |
| Reminders | `@macts/reminders` | `@macts/reminders-server` |
| Shortcuts | `@macts/shortcuts` | `@macts/shortcuts-server` |
| TV | `@macts/tv` | `@macts/tv-server` |

### macOS Utilities

| App | Client Package | Server Package |
|-----|---------------|----------------|
| Automator | `@macts/automator` | `@macts/automator-server` |
| Bluetooth File Exchange | `@macts/bluetooth-file-exchange` | `@macts/bluetooth-file-exchange-server` |
| Console | `@macts/console` | `@macts/console-server` |
| Screen Sharing | `@macts/screen-sharing` | `@macts/screen-sharing-server` |
| Script Editor | `@macts/script-editor` | `@macts/script-editor-server` |
| System Events | `@macts/system-events` | `@macts/system-events-server` |
| System Information | `@macts/system-information` | `@macts/system-information-server` |
| System Settings | `@macts/system-settings` | `@macts/system-settings-server` |
| Terminal | `@macts/terminal` | `@macts/terminal-server` |
| TextEdit | `@macts/textedit` | `@macts/textedit-server` |

### Browsers

| App | Client Package | Server Package |
|-----|---------------|----------------|
| Arc | `@macts/arc` | `@macts/arc-server` |
| Google Chrome | `@macts/google-chrome` | `@macts/google-chrome-server` |
| Microsoft Edge | `@macts/microsoft-edge` | `@macts/microsoft-edge-server` |
| Safari | `@macts/safari` | `@macts/safari-server` |

### Third-Party Apps

| App | Client Package | Server Package |
|-----|---------------|----------------|
| Alfred 5 | `@macts/alfred` | `@macts/alfred-server` |
| iTerm | `@macts/iterm` | `@macts/iterm-server` |
| Microsoft Word | `@macts/microsoft-word` | `@macts/microsoft-word-server` |
| OmniFocus | `@macts/omnifocus` | `@macts/omnifocus-server` |
| OmniGraffle | `@macts/omnigraffle` | `@macts/omnigraffle-server` |
| OmniPlan | `@macts/omniplan` | `@macts/omniplan-server` |
| Spotify | `@macts/spotify` | `@macts/spotify-server` |
| Xcode | `@macts/xcode` | `@macts/xcode-server` |

### Infrastructure Packages

| Package | Description |
|---------|-------------|
| `@macts/cli` | Command-line interface |
| `@macts/api` | HTTP API server |
| `@macts/core` | Manifest schemas, code generators, JXA bridge |
| `@macts/mcp` | MCP server framework |

### Which package should I use?

- **Building an app?** Install the client package for your target app (e.g., `@macts/calendar`) for programmatic access
- **Quick automation?** Use `@macts/cli` for command-line operations
- **AI assistant integration?** Install the server package (e.g., `@macts/calendar-server`) for MCP tools compatible with Claude, Copilot, or other MCP clients

## Architecture

```
┌───────────────────────────────────────────────────────┐
│  YOUR CODE                                            │
│                                                       │
│  SDK  (@macts/calendar)         ──► HTTP requests     │
│  CLI  (@macts/cli)              ──► HTTP requests     │
│  MCP  (@macts/calendar-server)  ──► HTTP requests     │
└────────────────────────┬──────────────────────────────┘
                         │ HTTP + Bearer Token
                         ▼
┌───────────────────────────────────────────────────────┐
│  API SERVER (@macts/api)                              │
│      ├── API key validation                           │
│      ├── Permission checking                          │
│      └── JXA execution                                │
└────────────────────────┬──────────────────────────────┘
                         │ osascript
                         ▼
                   macOS Applications
```

## Requirements

- **macOS** -- macts uses JXA (JavaScript for Automation) which is macOS-only
- **Node.js 20+** -- Required for the API server and SDK
- **Target apps** -- Must be installed and have granted automation permissions

## Permissions

macts uses a three-tier permission system to control API key access. Permissions follow the format `app:resource:operation`:

```bash
# Full access to an app
macts api-key create --name "full-access" --permissions "calendar:*"

# Read-only access
macts api-key create --name "read-only" --permissions "calendar:*:read"

# Specific operations
macts api-key create --name "events-only" --permissions "calendar:events:*"

# Fine-grained
macts api-key create --name "list-only" --permissions "calendar:events:list,calendar:calendars:list"
```

See [manifests/README.md](manifests/README.md) for the full permissions model documentation.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing, including how to add support for new macOS applications.

```bash
git clone https://github.com/mike-north/macts.git
cd macts
pnpm install
pnpm build
pnpm test
```

## License

MIT
