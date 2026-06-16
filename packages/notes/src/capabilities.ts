/**
 * Machine-readable capability metadata for Notes.
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
 * Every capability exposed by Notes, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'notes.accounts.get',
    app: 'notes',
    appBundleId: 'com.apple.Notes',
    resource: 'accounts',
    operation: 'get',
    description: 'Get an item by name',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Item name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'notes.accounts.list',
    app: 'notes',
    appBundleId: 'com.apple.Notes',
    resource: 'accounts',
    operation: 'list',
    description: 'List items',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'notes.attachments.get',
    app: 'notes',
    appBundleId: 'com.apple.Notes',
    resource: 'attachments',
    operation: 'get',
    description: 'Get an item by name',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Item name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'notes.attachments.list',
    app: 'notes',
    appBundleId: 'com.apple.Notes',
    resource: 'attachments',
    operation: 'list',
    description: 'List items',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'notes.folders.get',
    app: 'notes',
    appBundleId: 'com.apple.Notes',
    resource: 'folders',
    operation: 'get',
    description: 'Get an item by name',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Item name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'notes.folders.list',
    app: 'notes',
    appBundleId: 'com.apple.Notes',
    resource: 'folders',
    operation: 'list',
    description: 'List items',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'notes.notes.create',
    app: 'notes',
    appBundleId: 'com.apple.Notes',
    resource: 'notes',
    operation: 'create',
    description: 'Create a new note',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          description: 'HTML content of the note',
          type: 'string',
        },
        name: {
          description: 'The name of the note (first line)',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'notes.notes.get',
    app: 'notes',
    appBundleId: 'com.apple.Notes',
    resource: 'notes',
    operation: 'get',
    description: 'Get an item by name',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Item name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'notes.notes.list',
    app: 'notes',
    appBundleId: 'com.apple.Notes',
    resource: 'notes',
    operation: 'list',
    description: 'List items',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'notes.notes.show',
    app: 'notes',
    appBundleId: 'com.apple.Notes',
    resource: 'notes',
    operation: 'show',
    description: 'Show a note in the Notes app',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Note name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
]
