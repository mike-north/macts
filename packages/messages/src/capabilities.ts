/**
 * Machine-readable capability metadata for Messages.
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
 * Every capability exposed by Messages, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'messages.app.login',
    app: 'messages',
    appBundleId: 'com.apple.MobileSMS',
    resource: 'app',
    operation: 'login',
    description: 'Login to all accounts.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'messages.app.logout',
    app: 'messages',
    appBundleId: 'com.apple.MobileSMS',
    resource: 'app',
    operation: 'logout',
    description: 'Logout of all accounts.',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'messages.app.send',
    app: 'messages',
    appBundleId: 'com.apple.MobileSMS',
    resource: 'app',
    operation: 'send',
    description: 'Sends a message to a participant or to a chat.',
    permission: null,
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'The to parameter',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['to'],
    },
  },
]
