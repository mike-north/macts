/**
 * Machine-readable capability metadata for Music.
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
 * Every capability exposed by Music, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'music.app.add',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'add',
    description: 'add one or more files to a playlist',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'the location of the added file(s)',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.backTrack',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'backTrack',
    description:
      'reposition to beginning of current track or go to previous track if already at start of current track',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.close',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'close',
    description: 'Close an object',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.convert',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'convert',
    description: 'convert one or more files or tracks',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.count',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'count',
    description: 'Return the number of elements of a particular class within an object',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        each: {
          description:
            "the class of the elements to be counted. Keyword 'each' is optional in AppleScript",
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['each'],
    },
  },
  {
    name: 'music.app.delete',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'delete',
    description: 'Delete an element from an object',
    permission: null,
    risk: 'delete',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.download',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'download',
    description: 'download a cloud track or playlist',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.duplicate',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'duplicate',
    description: 'Duplicate one or more object(s)',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'the new location for the object(s)',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.exists',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'exists',
    description: 'Verify if an object exists',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.export',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'export',
    description: 'export a source or playlist',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        as: {
          description: 'the format to export for a playlist',
          type: 'string',
        },
        to: {
          description: 'the destination of the export',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.fastForward',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'fastForward',
    description: 'skip forward in a playing track',
    permission: null,
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.make',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'make',
    description: 'Make a new element',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        new: {
          description: "the class of the new element. Keyword 'new' is optional in AppleScript",
          type: 'string',
        },
        at: {
          description: 'the location at which to insert the element',
          type: 'string',
        },
        withProperties: {
          description: 'the initial values for the properties of the element',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['new'],
    },
  },
  {
    name: 'music.app.nextTrack',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'nextTrack',
    description: 'advance to the next track in the current playlist',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.open',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'open',
    description: 'Open the specified object(s)',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.openLocation',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'openLocation',
    description: 'Opens an iTunes Store or audio stream URL',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.pause',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'pause',
    description: 'pause playback',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.play',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'play',
    description: 'play the current track or the specified track or file.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        once: {
          description: 'If true, play this track once and then stop.',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.playpause',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'playpause',
    description: 'toggle the playing/paused state of the current track',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.previousTrack',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'previousTrack',
    description: 'return to the previous track in the current playlist',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.print',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'print',
    description: 'Print the specified object(s)',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        printDialog: {
          description: 'Should the application show the print dialog',
          type: 'boolean',
        },
        withProperties: {
          description: 'the print settings',
          type: 'string',
        },
        kind: {
          description: 'the kind of printout desired',
          type: 'string',
        },
        theme: {
          description: 'name of theme to use for formatting the printout',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.quit',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'quit',
    description: 'Quit the application',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.resume',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'resume',
    description: 'disable fast forward/rewind and resume playback, if playing.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.reveal',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'reveal',
    description: 'reveal and select a track or playlist',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.rewind',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'rewind',
    description: 'skip backwards in a playing track',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.run',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'run',
    description: 'Run the application',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.save',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'save',
    description: 'Save the specified object(s)',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.select',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'select',
    description: 'select the specified object(s)',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.app.stop',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'app',
    operation: 'stop',
    description: 'stop playback',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.filetracks.refresh',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'filetracks',
    operation: 'refresh',
    description: 'update file track information from the current information in the track’s file',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'music.playlists.move',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'playlists',
    operation: 'move',
    description: 'Move playlist(s) to a new location',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'the new location for the playlist(s)',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['to'],
    },
  },
  {
    name: 'music.playlists.search',
    app: 'music',
    appBundleId: 'com.apple.Music',
    resource: 'playlists',
    operation: 'search',
    description:
      'search a playlist for tracks matching the search string. Identical to entering search text in the Search field.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        for: {
          description: 'the search text',
          type: 'string',
        },
        only: {
          description: 'area to search (default is all)',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['for'],
    },
  },
]
