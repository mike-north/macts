/**
 * Types for MCP plugin generation.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '../../manifest/index.js'

/**
 * JSON Schema for MCP tool inputs.
 * Simplified representation matching MCP's JsonSchema interface.
 */
export interface JsonSchema {
  readonly type?: string
  readonly properties?: Record<string, JsonSchema>
  readonly required?: readonly string[]
  readonly items?: JsonSchema
  readonly enum?: readonly unknown[]
  readonly description?: string
  readonly additionalProperties?: boolean
  readonly [key: string]: unknown
}

/**
 * Context for MCP generator.
 */
export interface McpGeneratorContext {
  /** Application name (e.g., 'calendar') */
  appName: string
  /** App manifest */
  manifest: AppManifest
  /** Package name (e.g., '@macts/mcp-calendar') */
  packageName: string
  /** SDK package name (e.g., '@macts/sdk-calendar') */
  sdkPackageName: string
  /** Package version */
  version?: string | undefined
}

/**
 * A generated MCP tool definition.
 */
export interface GeneratedTool {
  /** Tool name (e.g., "macts__calendar__calendars_list") */
  name: string
  /** Resource name (e.g., "calendars") */
  resourceName: string
  /** Operation name (e.g., "list") */
  operationName: string
  /** Command name from manifest (e.g., "list") */
  commandName: string
  /** Tool description */
  description: string
  /** JSON Schema for tool input parameters */
  inputSchema: JsonSchema
  /** Whether this is a resource operation (true) or app command (false) */
  isResourceOperation: boolean
  /** Resource type name if this is a resource operation */
  resourceType?: string
}

/**
 * Generated tool file content.
 */
export interface GeneratedToolFile {
  /** File path relative to tools/ directory (e.g., 'calendars.ts') */
  fileName: string
  /** TypeScript source code */
  content: string
  /** Tools exported from this file */
  tools: GeneratedTool[]
}

/**
 * Result of MCP plugin generation.
 */
export interface GeneratedMcpPlugin {
  /** Plugin name (e.g., 'calendar') */
  pluginName: string
  /** Generated plugin.ts content */
  pluginContent: string
  /** Generated tool files */
  toolFiles: GeneratedToolFile[]
  /** Generated tools/index.ts content */
  toolsIndexContent: string
  /** Generated index.ts content */
  indexContent: string
  /** Generated package.json content */
  packageJson: string
  /** All generated tools */
  tools: GeneratedTool[]
  /** All generated files as path/content pairs */
  files: { path: string; content: string }[]
}
