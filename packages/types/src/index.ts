/**
 * Shared type definitions for the macts ecosystem.
 *
 * This package contains **types only** — it emits no runtime code. It exists so
 * that packages which need to describe an MCP plugin (for example, every
 * generated `@macts/<app>-server` package) can do so without taking a
 * dependency on the `@macts/mcp` server implementation.
 *
 * `@macts/mcp` re-exports everything here, so existing imports from
 * `@macts/mcp` continue to work unchanged.
 *
 * ## Manifest commands to MCP tools
 *
 * The macts framework defines app capabilities in YAML manifests (see
 * `@macts/core`). MCP plugins bridge manifest commands to the MCP protocol: a
 * manifest command becomes an {@link McpToolDefinition}, and an app's full set
 * of tools becomes an {@link McpPlugin}.
 *
 * ## Type system notes
 *
 * - **Handler arguments:** `unknown` — validated against `inputSchema` before the handler is called
 * - **Handler returns:** `unknown` — any JSON-serializable value (must match `outputSchema` if provided)
 * - **Runtime validation:** the MCP server validates inputs, but outputs are not enforced
 * - **Documentation:** `outputSchema` serves as self-documentation for AI assistants
 *
 * @packageDocumentation
 */

/**
 * JSON Schema type for tool input validation.
 *
 * Simplified representation - MCP uses JSON Schema Draft 7.
 */
export interface JsonSchema {
  readonly type?: string
  readonly properties?: Record<string, JsonSchema>
  readonly required?: readonly string[]
  readonly items?: JsonSchema
  readonly enum?: readonly unknown[]
  readonly description?: string
  readonly [key: string]: unknown
}

/**
 * MCP tool definition.
 *
 * Defines a single tool (RPC endpoint) exposed by a plugin.
 *
 * Tool names follow the pattern: `macts__<app>__<resource>_<operation>`
 * - Use double underscores (`__`) as namespace separators
 * - `<app>` is the macOS application name (e.g., 'calendar')
 * - `<resource>` is the entity type (e.g., 'calendars', 'events')
 * - `<operation>` is the action (e.g., 'list', 'get', 'create')
 *
 * @example
 * ```typescript
 * const listCalendarsTool: McpToolDefinition = {
 *   name: 'macts__calendar__calendars_list',
 *   description: 'List all calendars',
 *   inputSchema: { type: 'object', properties: {} },
 *   outputSchema: {
 *     type: 'array',
 *     items: {
 *       type: 'object',
 *       properties: {
 *         id: { type: 'string' },
 *         name: { type: 'string' },
 *       },
 *     },
 *   },
 *   handler: async () => {
 *     // Implementation returns array of calendar objects
 *     return [{ id: '123', name: 'Work' }];
 *   },
 * };
 * ```
 */
export interface McpToolDefinition {
  /**
   * Tool name following the pattern: `macts__<app>__<resource>_<operation>`
   *
   * @example 'macts__calendar__calendars_list'
   */
  readonly name: string

  /** Human-readable description of what the tool does */
  readonly description: string

  /**
   * JSON Schema for the tool's input parameters.
   *
   * The MCP server validates arguments against this schema before
   * passing them to the handler. Use JSON Schema Draft 7 syntax.
   *
   * @see https://json-schema.org/draft-07/json-schema-release-notes.html
   */
  readonly inputSchema: JsonSchema

  /**
   * JSON Schema for the tool's output.
   *
   * Optional but recommended - helps AI assistants understand what data
   * the tool returns without needing to read handler implementation.
   * The schema is not enforced at runtime but serves as documentation.
   *
   * @example
   * ```typescript
   * outputSchema: {
   *   type: 'object',
   *   properties: {
   *     success: { type: 'boolean' },
   *     message: { type: 'string' },
   *   },
   *   required: ['success'],
   * }
   * ```
   */
  readonly outputSchema?: JsonSchema

  /**
   * Handler function that executes the tool.
   *
   * **Type Safety Note:**
   * The handler uses `unknown` types for flexibility across different
   * tool implementations. In your handler implementation:
   * - Cast `args` to your specific input type
   * - Return data matching your `outputSchema`
   * - Ensure returned data is JSON-serializable
   *
   * The MCP server handles serialization automatically by calling
   * `JSON.stringify()` on the returned value.
   *
   * @param args - Tool arguments (validated against inputSchema before handler is called)
   * @returns Tool result - any JSON-serializable value (object, array, string, number, boolean, null)
   * @throws Error on failure - error message will be returned to the MCP client
   *
   * @example
   * ```typescript
   * handler: async (args) => {
   *   // Cast args to expected type
   *   const { calendarId } = args as { calendarId: string };
   *
   *   // Execute operation
   *   const calendar = await getCalendar(calendarId);
   *
   *   // Return JSON-serializable result
   *   return {
   *     id: calendar.id,
   *     name: calendar.name,
   *   };
   * }
   * ```
   */
  readonly handler: (args: unknown) => Promise<unknown>
}

/**
 * MCP plugin interface.
 *
 * A plugin provides tools for a specific application SDK.
 * Plugins are dynamically discovered from `@macts/<app>-server` packages.
 *
 * **Plugin Structure:**
 * Each plugin maps commands from an app manifest to MCP tools:
 * - Manifest commands define operations (from app YAML spec)
 * - Plugin tools expose those operations via MCP protocol
 * - Tool names follow convention: `macts__<app>__<resource>_<operation>`
 *
 * **Discovery Process:**
 * 1. MCP server scans `~/.macts/plugins/node_modules/` for `@macts/<app>-server` packages
 * 2. Each package must export a `plugin` object of type `McpPlugin`
 * 3. Tools from all plugins are registered in the MCP server
 * 4. Tool names must be globally unique across all plugins
 *
 * @example
 * ```typescript
 * import type { McpPlugin } from '@macts/mcp';
 *
 * export const calendarPlugin: McpPlugin = {
 *   name: 'calendar',
 *   description: 'Calendar.app automation via MCP',
 *   tools: [
 *     // Each tool corresponds to a manifest command
 *     listCalendarsTool,
 *     createEventTool,
 *     // ...
 *   ],
 * };
 * ```
 */
export interface McpPlugin {
  /**
   * Plugin name (e.g., 'calendar').
   *
   * Should match the app name from the manifest.
   * Used for logging and identification.
   */
  readonly name: string

  /**
   * Human-readable description of what the plugin provides.
   *
   * @example 'Calendar.app automation via MCP protocol'
   */
  readonly description: string

  /**
   * Tools provided by this plugin.
   *
   * Each tool typically corresponds to a command in the app's manifest.
   * All tool names must be unique across all loaded plugins.
   */
  readonly tools: readonly McpToolDefinition[]
}
