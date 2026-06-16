# MCP Generator

Generates MCP (Model Context Protocol) plugins from macts manifests.

## Overview

The MCP generator automatically creates MCP server plugins from application manifests. It converts manifest operations (commands) into MCP tools that can be exposed to LLM clients like Claude Desktop.

## Features

- **Automatic Tool Generation**: Converts manifest commands to MCP tool definitions
- **Type-Safe Schemas**: Generates JSON Schema for tool inputs from manifest property definitions
- **Resource Operations**: Supports both resource-scoped operations and application-level commands
- **Proper Naming**: Tool names follow the convention `macts__<app>__<resource>_<operation>` with snake_case operations
- **Complete Plugin Structure**: Generates all necessary files for a working MCP plugin package

## Usage

```typescript
import { generateMcpPlugin, createMcpGeneratorContext } from '@macts/core/generator'
import { loadManifest } from '@macts/core'

// Load manifest
const manifest = await loadManifest('path/to/app.yaml')

// Create generator context
const context = createMcpGeneratorContext({
  appName: 'calendar',
  manifest,
  packageName: '@macts/calendar-server', // optional
  version: '0.1.0', // optional
})

// Generate plugin
const result = generateMcpPlugin(context)

// Access generated files
console.log(result.pluginContent) // plugin.ts
console.log(result.indexContent) // index.ts
console.log(result.packageJson) // package.json
console.log(result.toolsIndexContent) // tools/index.ts

// Access individual tool files
for (const toolFile of result.toolFiles) {
  console.log(toolFile.fileName) // e.g., 'calendars.ts'
  console.log(toolFile.content) // TypeScript source
}
```

## Generated Structure

The generator produces a complete MCP plugin package:

```
@macts/calendar-server/
├── package.json
├── index.ts              # Main plugin export
├── plugin.ts             # Plugin definition
├── sdk.ts                # SDK import wrapper
└── tools/
    ├── index.ts          # All tools aggregated
    ├── calendars.ts      # Calendar resource tools
    ├── events.ts         # Event resource tools
    └── app.ts            # Application-level tools
```

## Tool Naming Convention

Tool names follow the format: `macts__<app>__<resource>_<operation>`

Examples:

- `macts__calendar__calendars_list` - List calendars
- `macts__calendar__calendars_get` - Get a calendar by ID
- `macts__calendar__events_create` - Create an event
- `macts__calendar__app_reload_calendars` - Reload calendars (app command)

Multi-word operations are converted to snake_case:

- `reloadCalendars` → `reload_calendars`
- `switchView` → `switch_view`

## Input Schema Generation

The generator converts manifest property types to JSON Schema:

### Manifest Property

```yaml
properties:
  name:
    access: rw
    type: string
    description: Calendar name
  color:
    access: rw
    type: string
    description: Calendar color
    optional: true
```

### Generated JSON Schema

```typescript
{
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Calendar name'
    },
    color: {
      type: 'string',
      description: 'Calendar color'
    }
  },
  required: ['name'],
  additionalProperties: false
}
```

## Operation Types

### Resource Operations

Generated for commands with `scope: resource`:

- **list**: List all instances of a resource
- **get**: Get a single instance by identifier
- **create**: Create a new instance with writable properties
- **update**: Update an instance (identifier + writable properties)
- **delete**: Delete an instance by identifier
- **show**: Display an instance in the app UI

### Application Commands

Generated for commands with `scope: application`:

- Custom operations that operate on the application (e.g., `reloadCalendars`, `switchView`)

## Type Safety

The generator uses TypeScript to ensure type safety:

```typescript
export interface GeneratedTool {
  name: string // e.g., "macts__calendar__calendars_list"
  resourceName: string // e.g., "calendars"
  operationName: string // e.g., "list"
  commandName: string // e.g., "list"
  description: string
  inputSchema: JsonSchema
  isResourceOperation: boolean
  resourceType?: string // e.g., "Calendar"
}
```

## Testing

The MCP generator includes comprehensive tests:

- **Unit Tests**: Test individual functions (tool generation, schema conversion)
- **Integration Tests**: Test with real manifests (Calendar app)
- **Edge Cases**: Handle optional properties, nested resources, multi-word operations

Run tests:

```bash
pnpm test src/generator/mcp
```

## Implementation Notes

### Property Type Mapping

| Manifest Type | JSON Schema Type  |
| ------------- | ----------------- |
| string        | string            |
| number        | number            |
| integer       | number            |
| boolean       | boolean           |
| date          | string (ISO 8601) |
| array         | array             |
| resource      | string (ID)       |
| enum          | string            |

### Generated Code Patterns

The generator produces TypeScript code that:

- Imports types from `@macts/mcp`
- Uses a `getSDK()` function for testability
- Follows the hand-crafted mcp-calendar patterns
- Includes proper error handling
- Returns consistent response formats

### Example Generated Tool

```typescript
export const calendarsListTool: McpToolDefinition = {
  name: 'macts__calendar__calendars_list',
  description: 'List all calendars from macOS Calendar.app',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const Calendar = getCalendarSDK()
    const app = await Calendar.connect()
    const items = await app.calendars.list()
    return items
  },
}
```

## Future Enhancements

Potential improvements:

- Support for pagination in list operations
- Filter/search parameters for list operations
- Bulk operations
- Transaction support
- Event subscriptions/webhooks
- Custom serialization for complex types

## See Also

- [MCP Server Documentation](../../mcp/README.md)
- [Manifest Schema](../../manifest/README.md)
- [SDK Generator](../README.md)
