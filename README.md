# macts

TypeScript SDKs for macOS app automation - control Calendar.app and other native macOS applications from your code.

## What is macts?

macts (macOS Automation Control TypeScript SDKs) lets you programmatically interact with macOS applications like Calendar.app. It provides:

- **Type-safe APIs** - Full TypeScript support with autocomplete and type checking
- **HTTP-based architecture** - A local API server handles JXA/AppleScript execution securely
- **Multiple interfaces** - Use via SDK, CLI, or MCP (Model Context Protocol) for AI assistants

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

Save the generated API key - you'll need it to authenticate SDK requests.

### 4. Use the SDK

```bash
npm install @macts/sdk-calendar
```

```typescript
import { CalendarClient } from '@macts/sdk-calendar'

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

## Packages

| Package               | Description                          | Install                                    |
| --------------------- | ------------------------------------ | ------------------------------------------ |
| `@macts/cli`          | Command-line interface for macts     | `npm install -g @macts/cli`                |
| `@macts/sdk-calendar` | TypeScript SDK for Calendar.app      | `npm install @macts/sdk-calendar`          |
| `@macts/mcp-calendar` | MCP plugin for AI assistants         | `macts plugin install @macts/mcp-calendar` |
| `@macts/api`          | HTTP API server (used internally)    | Bundled with CLI                           |
| `@macts/core`         | Core types and generators (internal) | -                                          |
| `@macts/mcp`          | MCP server framework (internal)      | -                                          |

### Which package should I use?

- **Building an app?** Use `@macts/sdk-calendar` for programmatic access
- **Quick automation?** Use `@macts/cli` for command-line operations
- **AI assistant integration?** Use `@macts/mcp-calendar` with Claude, Copilot, or other MCP-compatible tools

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  YOUR CODE                                              │
│                                                         │
│  SDK (@macts/sdk-calendar)  ──► HTTP requests           │
│  CLI (@macts/cli)           ──► HTTP requests           │
│  MCP (@macts/mcp-calendar)  ──► HTTP requests           │
└──────────────────────────────┬──────────────────────────┘
                               │ HTTP + Bearer Token
                               ▼
┌─────────────────────────────────────────────────────────┐
│  API SERVER (@macts/api)                                │
│      ├── API key validation                             │
│      ├── Permission checking                            │
│      └── JXA execution                                  │
└──────────────────────────────┬──────────────────────────┘
                               │ osascript
                               ▼
                          Calendar.app
```

## Requirements

- **macOS** - macts uses JXA (JavaScript for Automation) which is macOS-only
- **Node.js 20+** - Required for the API server and SDK
- **Calendar.app** - Must be installed and have granted automation permissions

## Permissions

macts uses a permission system to control what API keys can do:

```bash
# Full calendar access
macts api-key create --name "full-access" --permissions "calendar:*"

# Read-only access
macts api-key create --name "read-only" --permissions "calendar:calendars:list,calendar:events:list"

# Specific operations
macts api-key create --name "events-only" --permissions "calendar:events:*"
```

## Development Status

This project is under active development. The Calendar.app SDK is functional, with additional macOS applications planned.

| Feature       | Status       |
| ------------- | ------------ |
| Calendar SDK  | ✅ Available |
| Calendar CLI  | ✅ Available |
| Calendar MCP  | ✅ Available |
| Reminders SDK | 🚧 Planned   |
| Contacts SDK  | 🚧 Planned   |

## Contributing

```bash
# Clone the repository
git clone https://github.com/your-org/macts.git
cd macts

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## License

MIT
