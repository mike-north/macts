/**
 * Machine-readable capability metadata for System Events.
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
 * Every capability exposed by System Events, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'system-events.actions.perform',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'actions',
    operation: 'perform',
    description:
      'cause the target process to behave as if the action were applied to its UI element',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.abortTransaction',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'abortTransaction',
    description: 'Discard the results of a bounded update session with one or more files.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.attachActionTo',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'attachActionTo',
    description: 'Attach an action to a folder',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        using: {
          description: 'a file containing the script to attach',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['using'],
    },
  },
  {
    name: 'system-events.app.attachedScripts',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'attachedScripts',
    description: 'List the actions attached to a folder',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.beginTransaction',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'beginTransaction',
    description: 'Begin a bounded update session with one or more files.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.cancel',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'cancel',
    description: 'cause the target process to behave as if the UI element were cancelled',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.confirm',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'confirm',
    description: 'cause the target process to behave as if the UI element were confirmed',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.connect',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'connect',
    description: 'connect a configuration or service',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.decrement',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'decrement',
    description: 'cause the target process to behave as if the UI element were decremented',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.disconnect',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'disconnect',
    description: 'disconnect a configuration or service',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.doFolderAction',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'doFolderAction',
    description: 'Send a folder action code to a folder action script',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        folderActionCode: {
          description: 'the folder action message to process',
          type: 'string',
        },
        withItemList: {
          description: 'a list of items for the folder action message to process',
          type: 'string',
        },
        withWindowSize: {
          description: 'the new window size for the folder action message to process',
          type: 'object',
        },
      },
      additionalProperties: false,
      required: ['folderActionCode'],
    },
  },
  {
    name: 'system-events.app.editActionOf',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'editActionOf',
    description: 'Edit an action of a folder',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        usingActionName: {
          description: '...or the name of the action to edit',
          type: 'string',
        },
        usingActionNumber: {
          description: 'the index number of the action to edit...',
          type: 'number',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.endTransaction',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'endTransaction',
    description: 'Apply the results of a bounded update session with one or more files.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.increment',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'increment',
    description: 'cause the target process to behave as if the UI element were incremented',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.keyCode',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'keyCode',
    description: 'cause the target process to behave as if key codes were entered',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        using: {
          description: 'modifiers with which the key codes are to be entered',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.keyDown',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'keyDown',
    description: 'cause the target process to behave as if keys were held down',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.keyUp',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'keyUp',
    description: 'cause the target process to behave as if keys were released',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.keystroke',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'keystroke',
    description: 'cause the target process to behave as if keystrokes were entered',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        using: {
          description: 'modifiers with which the keystrokes are to be entered',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.logOut',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'logOut',
    description: 'Log out the current user',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.move',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'move',
    description: 'Move disk item(s) to a new location.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'The new location for the disk item(s).',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['to'],
    },
  },
  {
    name: 'system-events.app.open',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'open',
    description: 'Open disk item(s) with the appropriate application.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.pick',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'pick',
    description: 'cause the target process to behave as if the UI element were picked',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.removeActionFrom',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'removeActionFrom',
    description: 'Remove a folder action from a folder',
    permission: null,
    risk: 'delete',
    inputSchema: {
      type: 'object',
      properties: {
        usingActionName: {
          description: '...or the name of the action to remove',
          type: 'string',
        },
        usingActionNumber: {
          description: 'the index number of the action to remove...',
          type: 'number',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.restart',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'restart',
    description: 'Restart the computer',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {
        stateSavingPreference: {
          description: 'Is the user defined state saving preference followed?',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.shutDown',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'shutDown',
    description: 'Shut Down the computer',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {
        stateSavingPreference: {
          description: 'Is the user defined state saving preference followed?',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.sleep',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
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
    name: 'system-events.app.start',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'start',
    description: 'start the screen saver',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.app.stop',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'app',
    operation: 'stop',
    description: 'stop the screen saver',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.diskitems.delete',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'diskitems',
    operation: 'delete',
    description: 'Delete disk item(s).',
    permission: null,
    risk: 'delete',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'the unique ID of the disk item',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'system-events.uielements.click',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'uielements',
    operation: 'click',
    description: 'cause the target process to behave as if the UI element were clicked',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        at: {
          description:
            'when sent to a "process" object, the { x, y } location at which to click, in global coordinates',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'system-events.uielements.select',
    app: 'system-events',
    appBundleId: 'com.apple.systemevents',
    resource: 'uielements',
    operation: 'select',
    description: 'set the selected property of the UI element',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
