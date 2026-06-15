/**
 * Machine-readable capability metadata for Preview.
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
 * Every capability exposed by Preview, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'preview.documents.get',
    app: 'preview',
    appBundleId: 'com.apple.Preview',
    resource: 'documents',
    operation: 'get',
    description: 'Get a document by name',
    permission: 'preview:documents:get',
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
    name: 'preview.documents.list',
    app: 'preview',
    appBundleId: 'com.apple.Preview',
    resource: 'documents',
    operation: 'list',
    description: 'List all open documents',
    permission: 'preview:documents:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
