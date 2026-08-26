/**
 * MCP server types.
 *
 * ## Type System Overview
 *
 * The MCP server uses a flexible type system to support diverse tool implementations:
 *
 * - **Handler arguments:** `unknown` - validated against `inputSchema` before handler is called
 * - **Handler returns:** `unknown` - any JSON-serializable value (must match `outputSchema` if provided)
 * - **Runtime validation:** MCP server validates inputs, but outputs are not enforced
 * - **Documentation:** `outputSchema` serves as self-documentation for AI assistants
 *
 * ## Manifest Commands to MCP Tools
 *
 * The macts framework defines app capabilities in YAML manifests (see `@macts/core`).
 * MCP plugins bridge manifest commands to the MCP protocol:
 *
 * **Manifest Command** (from app.yaml):
 * ```yaml
 * commands:
 *   - name: listCalendars
 *     description: List all calendars
 *     scope: application
 *     parameters: []
 *     returns: Calendar[]
 * ```
 *
 * **MCP Tool** (in plugin):
 * ```typescript
 * const listCalendarsTool: McpToolDefinition = {
 *   name: 'macts__calendar__calendars_list',  // Follows naming convention
 *   description: 'List all calendars',        // From manifest
 *   inputSchema: { type: 'object' },          // Generated from parameters
 *   outputSchema: { ... },                    // Generated from returns type
 *   handler: async () => {
 *     // Calls SDK which executes the manifest command
 *     return await client.calendars.list();
 *   },
 * };
 * ```
 *
 * **Naming Convention:**
 * - Pattern: `macts__<app>__<resource>_<operation>`
 * - Namespace separator: `__` (double underscore)
 * - Examples:
 *   - `macts__calendar__calendars_list`
 *   - `macts__calendar__events_create`
 *   - `macts__calendar__app_reload_calendars`
 *
 * **Schema Generation:**
 * - `inputSchema` is derived from command parameters
 * - `outputSchema` is derived from command return type
 * - Both use JSON Schema Draft 7 format
 *
 * @packageDocumentation
 */

export type { JsonSchema, McpPlugin, McpToolDefinition } from '@macts/types'

/**
 * Options for creating an MCP server.
 */
export interface McpServerOptions {
  /** Server name (appears in MCP client) */
  readonly name?: string

  /** Server version */
  readonly version?: string

  /**
   * Skip validating a `MACTS_API_KEY` before connecting the stdio transport.
   *
   * Defaults to `false` — a valid API key is required by default. Only set
   * this for local development or trusted embedding scenarios; it disables
   * the one authentication check the stdio transport has.
   */
  readonly disableApiKeyValidation?: boolean
}
