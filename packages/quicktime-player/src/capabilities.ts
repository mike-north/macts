/**
 * Machine-readable capability metadata for QuickTime Player.
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
 * Every capability exposed by QuickTime Player, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'quicktime-player.app.export',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'export',
    description: 'Export a movie to another file',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        in: {
          description: 'the destination file',
          type: 'string',
        },
        usingSettingsPreset: {
          description: 'the name of the export settings preset to use',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['in', 'usingSettingsPreset'],
    },
  },
  {
    name: 'quicktime-player.app.newAudioRecording',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'newAudioRecording',
    description: 'Create a new audio recording document.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.newMovieRecording',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'newMovieRecording',
    description: 'Create a new movie recording document.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.newScreenRecording',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'newScreenRecording',
    description: 'Create a new screen recording document.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.openURL',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'openURL',
    description: 'Open a URL.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.pause',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'pause',
    description: 'Pause the recording.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.play',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'play',
    description: 'Play the movie.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.present',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'present',
    description: 'Present the document full screen.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.resume',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'resume',
    description: 'Resume the recording.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.showRemoteHud',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'showRemoteHud',
    description: "Show the document's Remote HUD",
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.start',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'start',
    description: 'Start the movie recording.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.stepBackward',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'stepBackward',
    description: 'Step the movie backward the specified number of steps (default is 1).',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        by: {
          description: 'number of steps',
          type: 'number',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.stepForward',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'stepForward',
    description: 'Step the movie forward the specified number of steps (default is 1).',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        by: {
          description: 'number of steps',
          type: 'number',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.stop',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'stop',
    description: 'Stop the movie or recording.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'quicktime-player.app.trim',
    app: 'quicktime-player',
    appBundleId: 'com.apple.QuickTimePlayerX',
    resource: 'app',
    operation: 'trim',
    description: 'Trim the movie.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        from: {
          description: 'start time in seconds',
          type: 'number',
        },
        to: {
          description: 'end time in seconds',
          type: 'number',
        },
      },
      additionalProperties: false,
      required: ['from', 'to'],
    },
  },
]
