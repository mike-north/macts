/**
 * Machine-readable capability metadata for Arc.
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
 * Every capability exposed by Arc, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'arc.app.close',
    app: 'arc',
    appBundleId: 'company.thebrowser.Browser',
    resource: 'app',
    operation: 'close',
    description: 'Close',
    permission: 'arc:app:close',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'arc.app.count',
    app: 'arc',
    appBundleId: 'company.thebrowser.Browser',
    resource: 'app',
    operation: 'count',
    description: 'Return the number of elements of a particular class within an object.',
    permission: 'arc:app:count',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        each: {
          description: 'The class of objects to be counted.',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'arc.app.execute',
    app: 'arc',
    appBundleId: 'company.thebrowser.Browser',
    resource: 'app',
    operation: 'execute',
    description: 'Execute a piece of javascript.',
    permission: 'arc:app:execute',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        javascript: {
          description: 'The javascript code to execute.',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['javascript'],
    },
  },
  {
    name: 'arc.app.focus',
    app: 'arc',
    appBundleId: 'company.thebrowser.Browser',
    resource: 'app',
    operation: 'focus',
    description: 'Focus on a space.',
    permission: 'arc:app:focus',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'arc.app.goBack',
    app: 'arc',
    appBundleId: 'company.thebrowser.Browser',
    resource: 'app',
    operation: 'goBack',
    description: 'Go Back (If Possible).',
    permission: 'arc:app:goBack',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'arc.app.goForward',
    app: 'arc',
    appBundleId: 'company.thebrowser.Browser',
    resource: 'app',
    operation: 'goForward',
    description: 'Go Forward (If Possible).',
    permission: 'arc:app:goForward',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'arc.app.make',
    app: 'arc',
    appBundleId: 'company.thebrowser.Browser',
    resource: 'app',
    operation: 'make',
    description: 'Make a new object.',
    permission: 'arc:app:make',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        new: {
          description: 'The class of the new object.',
          type: 'string',
        },
        withProperties: {
          description: 'The initial values for properties of the object.',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['new'],
    },
  },
  {
    name: 'arc.app.reload',
    app: 'arc',
    appBundleId: 'company.thebrowser.Browser',
    resource: 'app',
    operation: 'reload',
    description: 'Reload a tab.',
    permission: 'arc:app:reload',
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'arc.app.select',
    app: 'arc',
    appBundleId: 'company.thebrowser.Browser',
    resource: 'app',
    operation: 'select',
    description: 'Select the tab.',
    permission: 'arc:app:select',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'arc.app.stop',
    app: 'arc',
    appBundleId: 'company.thebrowser.Browser',
    resource: 'app',
    operation: 'stop',
    description: 'Stop the current tab from loading.',
    permission: 'arc:app:stop',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
