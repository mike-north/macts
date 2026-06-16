/**
 * MCP server implementation.
 *
 * @packageDocumentation
 */

// Using Server for low-level control over request handlers
// Note: Server is marked as deprecated in favor of McpServer, but we need it
// for low-level request handler registration
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js'
import type { McpPlugin, McpServerOptions } from './types.js'
import { VERSION } from '@macts/core'

/**
 * Create and start an MCP server with the given plugins.
 *
 * The server runs on stdio transport and registers all tools from the plugins.
 *
 * **How Tool Registration Works:**
 * 1. All tools from all plugins are collected into a single registry
 * 2. Tool names must be unique - duplicate names throw an error
 * 3. The MCP server exposes two RPC handlers:
 *    - `tools/list` - returns all available tools with their schemas
 *    - `tools/call` - executes a tool by name
 * 4. When a tool is called:
 *    - Arguments are validated against `inputSchema` (by MCP SDK)
 *    - The tool's handler function is invoked
 *    - Return value is JSON-serialized and sent to client
 *    - Errors are caught and returned with `isError: true`
 *
 * **Manifest Command Mapping:**
 * Each tool corresponds to a command from the app's manifest:
 * - Manifest defines available operations (YAML spec)
 * - Plugin creates MCP tools that call SDK methods
 * - SDK methods execute JXA scripts via HTTP API
 * - Results flow back through: JXA → API → SDK → MCP → Client
 *
 * @param plugins - Array of plugins providing tools (discovered from `@macts/<app>-server` packages)
 * @param options - Server configuration options
 * @returns Promise that resolves when the server is running
 * @throws Error if duplicate tool names are found across plugins
 *
 * @example
 * ```typescript
 * import { createMcpServer, discoverMcpPlugins } from '@macts/mcp';
 *
 * // Discover plugins from ~/.macts/plugins/
 * const { plugins } = await discoverMcpPlugins();
 *
 * // Start server on stdio
 * await createMcpServer(plugins, {
 *   name: 'macts-mcp',
 *   version: '1.0.0',
 * });
 * ```
 */
export async function createMcpServer(
  plugins: readonly McpPlugin[],
  options: McpServerOptions = {}
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const server = new Server(
    {
      name: options.name ?? 'macts-mcp',
      version: options.version ?? VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Build a map of tool name -> handler for fast lookup
  const toolHandlers = new Map<string, (args: unknown) => Promise<unknown>>()
  const toolSchemas = new Map<string, { name: string; description: string; inputSchema: unknown }>()

  for (const plugin of plugins) {
    for (const tool of plugin.tools) {
      if (toolHandlers.has(tool.name)) {
        throw new Error(`Duplicate tool name: ${tool.name}`)
      }
      toolHandlers.set(tool.name, tool.handler)
      toolSchemas.set(tool.name, {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })
    }
  }

  // Register ListTools handler
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: Array.from(toolSchemas.values()),
    }
  })

  // Register CallTool handler
  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params

    const handler = toolHandlers.get(name)
    if (!handler) {
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      }
    }

    try {
      const result = await handler(args ?? {})

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool ${name}: ${message}`,
          },
        ],
        isError: true,
      }
    }
  })

  // Connect to stdio transport
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Set up graceful shutdown handlers (only in production)
  // Skip in test environment to avoid interfering with test lifecycle
  if (process.env['NODE_ENV'] !== 'test') {
    const cleanup = (): void => {
      // Close the transport to stop accepting new connections
      // The process will exit after the current connection is closed
      process.exit(0)
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
  }
}
