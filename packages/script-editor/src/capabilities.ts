/**
 * Machine-readable capability metadata for Script Editor.
 *
 * Generated from the app manifest. Each entry describes one capability —
 * its stable name, app dependency, required permission (`app:resource:operation`),
 * and risk classification (read | write | delete | send | execute | system-change).
 *
 * @packageDocumentation
 */

/**
 * Risk classification for a capability.
 */
export type CapabilityRisk = 'read' | 'write' | 'delete' | 'send' | 'execute' | 'system-change'

/**
 * Machine-readable description of a single capability.
 */
export interface CapabilityMetadata {
  /** Stable dotted capability name (`<app>.<resource>.<operation>`). */
  readonly name: string
  /** App this capability belongs to. */
  readonly app: string
  /** Bundle identifier of the app dependency. */
  readonly appBundleId: string
  /** Resource the operation targets (`app` for app-scoped capabilities). */
  readonly resource: string
  /** Operation name. */
  readonly operation: string
  /** Human-readable description. */
  readonly description: string
  /** Required permission in `app:resource:operation` form, or null if none. */
  readonly permission: string | null
  /** Deterministic risk classification. */
  readonly risk: CapabilityRisk
  /** JSON Schema for the capability's input. */
  readonly inputSchema: Record<string, unknown>
}

/**
 * Every capability exposed by Script Editor, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'script-editor.documents.create',
    app: 'script-editor',
    appBundleId: 'com.apple.ScriptEditor2',
    resource: 'documents',
    operation: 'create',
    description: 'Create a new script document',
    permission: 'scripteditor:documents:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        contents: {
          description: 'Initial script contents',
          type: 'string',
        },
        name: {
          description: 'The name of the document',
          type: 'string',
        },
        language: {
          description: 'The scripting language (AppleScript or JavaScript)',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['language'],
    },
  },
  {
    name: 'script-editor.documents.get',
    app: 'script-editor',
    appBundleId: 'com.apple.ScriptEditor2',
    resource: 'documents',
    operation: 'get',
    description: 'Get a script document by name',
    permission: 'scripteditor:documents:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Document name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'script-editor.documents.list',
    app: 'script-editor',
    appBundleId: 'com.apple.ScriptEditor2',
    resource: 'documents',
    operation: 'list',
    description: 'List all open script documents',
    permission: 'scripteditor:documents:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
