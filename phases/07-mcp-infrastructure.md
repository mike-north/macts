# Phase 7: MCP Infrastructure

## Goal

Build the MCP (Model Context Protocol) server (`@macts/mcp`) and the plugin generation system that produces app-specific MCP plugins (`@macts/mcp-<app>`).

## Key Deliverables

1. **Core MCP Server (@macts/mcp)**
   - MCP server implementation using `@anthropic-ai/sdk` or `@modelcontextprotocol/sdk`
   - Plugin discovery: finds installed `@macts/mcp-*` packages
   - Tool registration from plugins
   - Stdio transport (for Claude Code integration)
   - SSE transport (for web integrations)

2. **Plugin System**
   - Plugin interface that mcp-<app> packages implement
   - Dynamic loading and tool registration
   - Namespaced tool naming: `macts__<app>__<resource>_<operation>`

3. **MCP Generator**
   - Generate `@macts/mcp-<app>` packages from manifests
   - Tool definitions from hierarchy + commands
   - Input schemas from JSON Schema files
   - Descriptions from manifest descriptions

4. **Tool Categories**
   - CRUD tools derived from hierarchy:
     - `macts__calendar__calendars_list`
     - `macts__calendar__calendars_get`
     - `macts__calendar__calendars_create`
     - `macts__calendar__calendars_update`
     - `macts__calendar__calendars_delete`
     - `macts__calendar__events_list` (with parent context)
   - Command tools from commands section:
     - `macts__calendar__reload_calendars`
     - `macts__calendar__switch_view`
     - `macts__calendar__events_show`

## Tool Naming Convention

```
macts__<app>__<resource>_<operation>
macts__<app>__<command>

Examples:
macts__calendar__calendars_list
macts__calendar__calendars_get
macts__calendar__events_create
macts__calendar__reload_calendars
macts__calendar__switch_view
macts__omnifocus__tasks_list
macts__omnifocus__projects_create
```

## Dependencies

- Phase 0 (project foundation)
- Phase 1 (manifest schemas)
- Phase 4 (SDK generation patterns)
- Phase 5 (Calendar SDK)

## Critical Files

```
packages/mcp/
├── package.json
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── plugin-loader.ts      # Plugin discovery
│   ├── transport/
│   │   ├── stdio.ts          # Stdio transport
│   │   └── sse.ts            # SSE transport
│   └── utils/
│       └── tool-naming.ts    # Tool name generation

packages/core/src/
├── generator/
│   └── mcp/
│       ├── index.ts          # generateMcpPlugin()
│       ├── tools.ts          # Generate tool definitions
│       ├── handlers.ts       # Generate tool handlers
│       └── package.ts        # Generate package structure

packages/mcp-calendar/        # Generated plugin
├── package.json
├── src/
│   ├── index.ts              # Plugin export
│   ├── plugin.ts             # Plugin implementation
│   └── tools/
│       ├── calendars.ts      # Calendar CRUD tools
│       ├── events.ts         # Event CRUD tools
│       └── commands.ts       # App commands tools
```

## Plugin Interface

```typescript
// @macts/mcp exports this interface
interface McpPlugin {
  name: string // 'calendar'
  description: string
  tools: ToolDefinition[]
  handlers: Map<string, ToolHandler>
}

interface ToolDefinition {
  name: string // 'macts__calendar__calendars_list'
  description: string
  inputSchema: JsonSchema
}

type ToolHandler = (input: unknown) => Promise<unknown>
```

## Generated Tool Example

```typescript
// Generated: calendars.ts
import { Calendar } from '@macts/sdk-calendar'
import { z } from 'zod'

export const calendarsListTool: ToolDefinition = {
  name: 'macts__calendar__calendars_list',
  description: 'List all calendars in the Calendar app',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
}

export async function calendarsListHandler(_input: unknown): Promise<unknown> {
  const app = new Calendar()
  const calendars = await app.calendars.list()
  return { calendars }
}

export const calendarsGetTool: ToolDefinition = {
  name: 'macts__calendar__calendars_get',
  description: 'Get a specific calendar by its unique identifier',
  inputSchema: {
    type: 'object',
    properties: {
      uid: {
        type: 'string',
        description: 'The unique identifier of the calendar',
      },
    },
    required: ['uid'],
  },
}

export async function calendarsGetHandler(input: { uid: string }): Promise<unknown> {
  const app = new Calendar()
  const calendar = await app.calendars.get(input.uid)
  return { calendar }
}

// Event tools need parent context
export const eventsListTool: ToolDefinition = {
  name: 'macts__calendar__events_list',
  description: 'List all events in a calendar',
  inputSchema: {
    type: 'object',
    properties: {
      calendarUid: {
        type: 'string',
        description: 'The unique identifier of the parent calendar',
      },
      after: {
        type: 'string',
        format: 'date-time',
        description: 'Only return events after this date',
      },
      before: {
        type: 'string',
        format: 'date-time',
        description: 'Only return events before this date',
      },
    },
    required: ['calendarUid'],
  },
}
```

## Integration with Claude Code

```json
// claude_code_config.json
{
  "mcpServers": {
    "macts": {
      "command": "macts",
      "args": ["--mcp"],
      "env": {}
    }
  }
}
```

Or for a specific app:

```json
{
  "mcpServers": {
    "macts-calendar": {
      "command": "npx",
      "args": ["@macts/mcp-calendar"],
      "env": {}
    }
  }
}
```

## Success Criteria

- [ ] MCP server starts and responds to `tools/list`
- [ ] Tool definitions have correct JSON Schema inputs
- [ ] `macts__calendar__calendars_list` returns calendar list
- [ ] `macts__calendar__events_create` creates an event
- [ ] Nested resource tools include parent ID in schema
- [ ] Plugin discovery works with installed @macts/mcp-\* packages
- [ ] Server integrates with Claude Code via stdio
- [ ] Error responses follow MCP error format
- [ ] Tool descriptions are clear enough for AI agents
