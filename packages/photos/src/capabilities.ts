/**
 * Machine-readable capability metadata for Photos.
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
 * Every capability exposed by Photos, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'photos.albums.get',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'albums',
    operation: 'get',
    description: 'Get an album by ID',
    permission: 'photos:albums:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Album identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'photos.albums.list',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'albums',
    operation: 'list',
    description: 'List all albums',
    permission: 'photos:albums:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'photos.app.add',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'add',
    description: 'Add media items to an album',
    permission: 'photos:albums:add',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        mediaItems: {
          description: 'The list of media items to add',
          type: 'array',
          items: {
            type: 'string',
          },
        },
        to: {
          description: 'The album to add to',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['mediaItems', 'to'],
    },
  },
  {
    name: 'photos.app.delete',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'delete',
    description: 'Delete an album or folder',
    permission: 'photos:containers:delete',
    risk: 'delete',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          description: 'The album or folder to delete',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['target'],
    },
  },
  {
    name: 'photos.app.export',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'export',
    description: 'Export media items to the specified location as files',
    permission: 'photos:export:files',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        mediaItems: {
          description: 'The list of media items to export',
          type: 'array',
          items: {
            type: 'string',
          },
        },
        to: {
          description: 'The destination of the export',
          type: 'string',
        },
        usingOriginals: {
          description: 'Export the original files if true, otherwise export rendered jpgs',
          type: 'boolean',
        },
      },
      additionalProperties: false,
      required: ['mediaItems', 'to'],
    },
  },
  {
    name: 'photos.app.import',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'import',
    description: 'Import files into the library',
    permission: 'photos:import:files',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          description: 'The list of files to copy',
          type: 'array',
          items: {
            type: 'string',
          },
        },
        into: {
          description: 'The album to import into',
          type: 'string',
        },
        skipCheckDuplicates: {
          description: 'Skip duplicate checking and import everything',
          type: 'boolean',
        },
      },
      additionalProperties: false,
      required: ['files'],
    },
  },
  {
    name: 'photos.app.make',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'make',
    description: 'Create a new album or folder',
    permission: 'photos:containers:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        new: {
          description: 'The class of the new object (album or folder)',
          type: 'string',
        },
        named: {
          description: 'The name of the new object',
          type: 'string',
        },
        at: {
          description: 'The parent folder for the new object',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['new'],
    },
  },
  {
    name: 'photos.app.nextSlide',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'nextSlide',
    description: 'Skip to next slide in currently-playing slideshow',
    permission: 'photos:slideshow:next',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'photos.app.pauseSlideshow',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'pauseSlideshow',
    description: 'Pause the currently-playing slideshow',
    permission: 'photos:slideshow:pause',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'photos.app.previousSlide',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'previousSlide',
    description: 'Skip to previous slide in currently-playing slideshow',
    permission: 'photos:slideshow:previous',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'photos.app.resumeSlideshow',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'resumeSlideshow',
    description: 'Resume the currently-playing slideshow',
    permission: 'photos:slideshow:resume',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'photos.app.search',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'search',
    description: 'Search for items matching the search string',
    permission: 'photos:app:search',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        for: {
          description: 'The text to search for',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['for'],
    },
  },
  {
    name: 'photos.app.spotlight',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'spotlight',
    description: 'Show the image at path in the application',
    permission: 'photos:app:spotlight',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          description: 'The full path to the image or media item ID',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['target'],
    },
  },
  {
    name: 'photos.app.startSlideshow',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'startSlideshow',
    description: 'Display an ad-hoc slide show from a list of media items',
    permission: 'photos:slideshow:start',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        using: {
          description: 'The media items to show',
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
      additionalProperties: false,
      required: ['using'],
    },
  },
  {
    name: 'photos.app.stopSlideshow',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'app',
    operation: 'stopSlideshow',
    description: 'End the currently-playing slideshow',
    permission: 'photos:slideshow:stop',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'photos.folders.get',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'folders',
    operation: 'get',
    description: 'Get a folder by ID',
    permission: 'photos:folders:get',
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
    name: 'photos.folders.list',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'folders',
    operation: 'list',
    description: 'List all folders',
    permission: 'photos:folders:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'photos.mediaitems.duplicate',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'mediaitems',
    operation: 'duplicate',
    description: 'Duplicate a media item',
    permission: 'photos:mediaItems:duplicate',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'The media item to duplicate',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'photos.mediaitems.get',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'mediaitems',
    operation: 'get',
    description: 'Get a media item by ID',
    permission: 'photos:mediaItems:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Media item identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'photos.mediaitems.list',
    app: 'photos',
    appBundleId: 'com.apple.Photos',
    resource: 'mediaitems',
    operation: 'list',
    description: 'List all media items',
    permission: 'photos:mediaItems:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
