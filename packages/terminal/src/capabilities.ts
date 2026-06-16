/**
 * Machine-readable capability metadata for Terminal.
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
 * Every capability exposed by Terminal, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'terminal.app.doScript',
    app: 'terminal',
    appBundleId: 'com.apple.Terminal',
    resource: 'app',
    operation: 'doScript',
    description: 'Execute a shell command in a Terminal window or tab',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          description: 'The command to execute',
          type: 'string',
        },
        in: {
          description: 'The window or tab to run the command in',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['command'],
    },
  },
  {
    name: 'terminal.settingssets.get',
    app: 'terminal',
    appBundleId: 'com.apple.Terminal',
    resource: 'settingssets',
    operation: 'get',
    description: 'Get an item by identifier',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Item identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'terminal.settingssets.list',
    app: 'terminal',
    appBundleId: 'com.apple.Terminal',
    resource: 'settingssets',
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
    name: 'terminal.tabs.get',
    app: 'terminal',
    appBundleId: 'com.apple.Terminal',
    resource: 'tabs',
    operation: 'get',
    description: 'Get an item by identifier',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Item identifier',
          type: 'string',
        },
        tty: {
          description: 'The tty device of the tab',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name', 'tty'],
    },
  },
  {
    name: 'terminal.tabs.list',
    app: 'terminal',
    appBundleId: 'com.apple.Terminal',
    resource: 'tabs',
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
    name: 'terminal.windows.get',
    app: 'terminal',
    appBundleId: 'com.apple.Terminal',
    resource: 'windows',
    operation: 'get',
    description: 'Get an item by identifier',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Item identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'terminal.windows.list',
    app: 'terminal',
    appBundleId: 'com.apple.Terminal',
    resource: 'windows',
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
]
