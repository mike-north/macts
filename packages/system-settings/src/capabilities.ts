/**
 * Machine-readable capability metadata for System Settings.
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
 * Every capability exposed by System Settings, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'system-settings.app.reveal',
    app: 'system-settings',
    appBundleId: 'com.apple.systempreferences',
    resource: 'app',
    operation: 'reveal',
    description: 'Reveals a settings pane or an anchor within a pane.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-settings.panes.authorize',
    app: 'system-settings',
    appBundleId: 'com.apple.systempreferences',
    resource: 'panes',
    operation: 'authorize',
    description:
      'Prompt for authorization for a settings pane. Deprecated: no longer does anything.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-settings.panes.timedLoad',
    app: 'system-settings',
    appBundleId: 'com.apple.systempreferences',
    resource: 'panes',
    operation: 'timedLoad',
    description:
      'Times and loads given settings pane and returns load time. Deprecated: no longer does anything.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
