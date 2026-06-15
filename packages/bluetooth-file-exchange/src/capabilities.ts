/**
 * Machine-readable capability metadata for Bluetooth File Exchange.
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
 * Every capability exposed by Bluetooth File Exchange, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'bluetooth-file-exchange.app.browse',
    app: 'bluetooth-file-exchange',
    appBundleId: 'com.apple.BluetoothFileExchange',
    resource: 'app',
    operation: 'browse',
    description: 'Browse a device',
    permission: 'bluetooth-file-exchange:app:browse',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        device: {
          description: 'The device to browse',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'bluetooth-file-exchange.app.send',
    app: 'bluetooth-file-exchange',
    appBundleId: 'com.apple.BluetoothFileExchange',
    resource: 'app',
    operation: 'send',
    description: 'Send a file to a bluetooth device',
    permission: 'bluetooth-file-exchange:app:send',
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          description: 'The file(s) to send',
          type: 'array',
          items: {
            type: 'string',
          },
        },
        toDevice: {
          description: 'The device to send the file to',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
]
