/**
 * Machine-readable capability metadata for Finder.
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
 * Every capability exposed by Finder, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'finder.app.activate',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'activate',
    description: 'Activate the specified window (or the Finder)',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.cleanUp',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'cleanUp',
    description:
      'Arrange items in window nicely (only applies to open windows in icon view that are not kept arranged)',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        by: {
          description: 'the order in which to clean up the objects (name, index, date, etc.)',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.close',
    app: 'finder',
    appBundleId: 'com.apple.finder',
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
    name: 'finder.app.copy',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'copy',
    description:
      '(NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front application)',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.count',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'count',
    description: 'Return the number of elements of a particular class within an object',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        each: {
          description: 'the class of the elements to be counted',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['each'],
    },
  },
  {
    name: 'finder.app.dataSize',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'dataSize',
    description: 'Return the size in bytes of an object',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        as: {
          description: 'the data type for which the size is calculated',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.delete',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'delete',
    description: 'Move an item from its container to the trash',
    permission: null,
    risk: 'delete',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.duplicate',
    app: 'finder',
    appBundleId: 'com.apple.finder',
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
        replacing: {
          description:
            'Specifies whether or not to replace items in the destination that have the same name as items being duplicated',
          type: 'boolean',
        },
        routingSuppressed: {
          description:
            'Specifies whether or not to autoroute items (default is false). Only applies when copying to the system folder.',
          type: 'boolean',
        },
        exactCopy: {
          description: 'Specifies whether or not to copy permissions/ownership as is',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.eject',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'eject',
    description: 'Eject the specified disk(s)',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.empty',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'empty',
    description: 'Empty the trash',
    permission: null,
    risk: 'delete',
    inputSchema: {
      type: 'object',
      properties: {
        security: {
          description: '(obsolete)',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.erase',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'erase',
    description: '(NOT AVAILABLE) Erase the specified disk(s)',
    permission: null,
    risk: 'delete',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.exists',
    app: 'finder',
    appBundleId: 'com.apple.finder',
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
    name: 'finder.app.make',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'make',
    description: 'Make a new element',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        new: {
          description: 'the class of the new element',
          type: 'string',
        },
        at: {
          description: 'the location at which to insert the element',
          type: 'string',
        },
        to: {
          description:
            'when creating an alias file, the original item to create an alias to or when creating a file viewer window, the target of the window',
          type: 'string',
        },
        withProperties: {
          description: 'the initial values for the properties of the element',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['new', 'at'],
    },
  },
  {
    name: 'finder.app.move',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'move',
    description: 'Move object(s) to a new location',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'the new location for the object(s)',
          type: 'string',
        },
        replacing: {
          description:
            'Specifies whether or not to replace items in the destination that have the same name as items being moved',
          type: 'boolean',
        },
        positionedAt: {
          description:
            'Gives a list (in local window coordinates) of positions for the destination items',
          type: 'string',
        },
        routingSuppressed: {
          description:
            'Specifies whether or not to autoroute items (default is false). Only applies when moving to the system folder.',
          type: 'boolean',
        },
      },
      additionalProperties: false,
      required: ['to'],
    },
  },
  {
    name: 'finder.app.open',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'open',
    description: 'Open the specified object(s)',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        using: {
          description: 'the application file to open the object with',
          type: 'string',
        },
        withProperties: {
          description:
            'the initial values for the properties, to be included with the open command sent to the application that opens the direct object',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.openVirtualLocation',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'openVirtualLocation',
    description: 'Private event to open a virtual location',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.print',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'print',
    description: 'Print the specified object(s)',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        withProperties: {
          description:
            'optional properties to be included with the print command sent to the application that prints the direct object',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.quit',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'quit',
    description: 'Quit the Finder',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.restart',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'restart',
    description: 'Restart the computer',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.reveal',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'reveal',
    description: 'Bring the specified object(s) into view',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.select',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'select',
    description: 'Select the specified object(s)',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.shutDown',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'shutDown',
    description: 'Shut Down the computer',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.sleep',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'sleep',
    description: 'Put the computer to sleep',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'finder.app.sort',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'sort',
    description: 'Return the specified object(s) in a sorted list',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        by: {
          description: 'the property to sort the items by (name, index, date, etc.)',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['by'],
    },
  },
  {
    name: 'finder.app.update',
    app: 'finder',
    appBundleId: 'com.apple.finder',
    resource: 'app',
    operation: 'update',
    description:
      'Update the display of the specified object(s) to match their on-disk representation',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        necessity: {
          description: 'only update if necessary (i.e. a finder window is open). default is false',
          type: 'boolean',
        },
        registeringApplications: {
          description: 'register applications. default is true',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
]
