/**
 * Machine-readable capability metadata for TextEdit.
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
 * Every capability exposed by TextEdit, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'textedit.documents.create',
    app: 'textedit',
    appBundleId: 'com.apple.TextEdit',
    resource: 'documents',
    operation: 'create',
    description: 'Create a new document',
    permission: 'textedit:documents:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          description: 'Initial text content',
          type: 'string',
        },
        name: {
          description: 'The name of the document',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'textedit.documents.get',
    app: 'textedit',
    appBundleId: 'com.apple.TextEdit',
    resource: 'documents',
    operation: 'get',
    description: 'Get a document by name',
    permission: 'textedit:documents:get',
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
    name: 'textedit.documents.list',
    app: 'textedit',
    appBundleId: 'com.apple.TextEdit',
    resource: 'documents',
    operation: 'list',
    description: 'List all open documents',
    permission: 'textedit:documents:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
