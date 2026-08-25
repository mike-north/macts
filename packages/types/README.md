# @macts/types

Shared, zero-runtime type definitions for the macts ecosystem.

This package emits no runtime code. It exists so that packages which need to
_describe_ an MCP plugin can do so without depending on the MCP server
implementation in [`@macts/mcp`](../mcp).

## What's here

| Type                | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `McpPlugin`         | An app's complete set of MCP tools                        |
| `McpToolDefinition` | A single MCP tool — name, description, schemas, handler   |
| `JsonSchema`        | Simplified JSON Schema Draft 7 shape used by tool schemas |

## Who uses it

Every generated `@macts/<app>-server` package depends on `@macts/types` to type
its MCP plugin. Because the types carry no runtime weight, this is an ordinary
`dependencies` entry — a server package does not imply the MCP server itself.

`@macts/mcp` re-exports all three types, so existing imports keep working:

```typescript
// both of these resolve to the same types
import type { McpPlugin } from '@macts/types'
import type { McpPlugin } from '@macts/mcp'
```

## Usage

```typescript
import type { McpPlugin, McpToolDefinition } from '@macts/types'

const listCalendars: McpToolDefinition = {
  name: 'macts__calendar__calendars_list',
  description: 'List all calendars',
  inputSchema: { type: 'object' },
  handler: async () => [{ name: 'Work' }],
}

export const calendarPlugin: McpPlugin = {
  name: 'calendar',
  description: 'Calendar.app automation via MCP',
  tools: [listCalendars],
}
```

## License

MIT
