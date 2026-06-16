/**
 * Machine-readable capability metadata for Shortcuts.
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
 * Every capability exposed by Shortcuts, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'shortcuts.folders.get',
    app: 'shortcuts',
    appBundleId: 'com.apple.shortcuts',
    resource: 'folders',
    operation: 'get',
    description: 'Get a folder by ID',
    permission: 'shortcuts:folders:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Folder identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'shortcuts.folders.list',
    app: 'shortcuts',
    appBundleId: 'com.apple.shortcuts',
    resource: 'folders',
    operation: 'list',
    description: 'List all folders',
    permission: 'shortcuts:folders:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'shortcuts.shortcuts.get',
    app: 'shortcuts',
    appBundleId: 'com.apple.shortcuts',
    resource: 'shortcuts',
    operation: 'get',
    description: 'Get a shortcut by ID',
    permission: 'shortcuts:shortcuts:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Shortcut identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'shortcuts.shortcuts.list',
    app: 'shortcuts',
    appBundleId: 'com.apple.shortcuts',
    resource: 'shortcuts',
    operation: 'list',
    description: 'List all shortcuts',
    permission: 'shortcuts:shortcuts:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'shortcuts.shortcuts.run',
    app: 'shortcuts',
    appBundleId: 'com.apple.shortcuts',
    resource: 'shortcuts',
    operation: 'run',
    description:
      "Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell 'Shortcuts Events' instead of 'Shortcuts'.",
    permission: 'shortcuts:shortcuts:run',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'The shortcut to run',
          type: 'string',
        },
        withInput: {
          description: 'The input to provide to the shortcut',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
]
