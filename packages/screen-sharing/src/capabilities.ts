/**
 * Machine-readable capability metadata for Screen Sharing.
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
 * Every capability exposed by Screen Sharing, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'screen-sharing.app.getURL',
    app: 'screen-sharing',
    appBundleId: 'com.apple.ScreenSharing',
    resource: 'app',
    operation: 'getURL',
    description: 'Open a vnc URL',
    permission: 'screen-sharing:app:getURL',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          description: 'The VNC URL to open',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['url'],
    },
  },
  {
    name: 'screen-sharing.connections.get',
    app: 'screen-sharing',
    appBundleId: 'com.apple.ScreenSharing',
    resource: 'connections',
    operation: 'get',
    description: 'Get a connection by ID',
    permission: 'screen-sharing:connections:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Connection identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'screen-sharing.connections.list',
    app: 'screen-sharing',
    appBundleId: 'com.apple.ScreenSharing',
    resource: 'connections',
    operation: 'list',
    description: 'List all screen sharing connections',
    permission: 'screen-sharing:connections:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
