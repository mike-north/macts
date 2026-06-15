/**
 * Machine-readable capability metadata for Spotify.
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
 * Every capability exposed by Spotify, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'spotify.app.nextTrack',
    app: 'spotify',
    appBundleId: 'com.spotify.client',
    resource: 'app',
    operation: 'nextTrack',
    description: 'Skip to the next track.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'spotify.app.pause',
    app: 'spotify',
    appBundleId: 'com.spotify.client',
    resource: 'app',
    operation: 'pause',
    description: 'Pause playback.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'spotify.app.play',
    app: 'spotify',
    appBundleId: 'com.spotify.client',
    resource: 'app',
    operation: 'play',
    description: 'Resume playback.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'spotify.app.playTrack',
    app: 'spotify',
    appBundleId: 'com.spotify.client',
    resource: 'app',
    operation: 'playTrack',
    description: 'Start playback of a track in the given context.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        inContext: {
          description: 'the URI of the context to play in',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'spotify.app.playpause',
    app: 'spotify',
    appBundleId: 'com.spotify.client',
    resource: 'app',
    operation: 'playpause',
    description: 'Toggle play/pause.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'spotify.app.previousTrack',
    app: 'spotify',
    appBundleId: 'com.spotify.client',
    resource: 'app',
    operation: 'previousTrack',
    description: 'Skip to the previous track.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
