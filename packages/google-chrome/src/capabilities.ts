/**
 * Machine-readable capability metadata for Google Chrome.
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
 * Every capability exposed by Google Chrome, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'google-chrome.app.close',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'close',
    description: 'Close a window.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.copySelection',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'copySelection',
    description: 'Copy text.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.count',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'count',
    description: 'Return the number of elements of a particular class within an object.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        each: {
          description: 'The class of objects to be counted.',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.cutSelection',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'cutSelection',
    description: 'Cut selected text (If Possible).',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.delete',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'delete',
    description: 'Delete an object.',
    permission: null,
    risk: 'delete',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.duplicate',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'duplicate',
    description: 'Copy object(s) and put the copies at a new location.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'The location for the new object(s).',
          type: 'string',
        },
        withProperties: {
          description: 'Properties to be set in the new duplicated object(s).',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.execute',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'execute',
    description: 'Execute a piece of javascript.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        javascript: {
          description: 'The javascript code to execute.',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['javascript'],
    },
  },
  {
    name: 'google-chrome.app.exists',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'exists',
    description: 'Verify if an object exists.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.goBack',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'goBack',
    description: 'Go Back (If Possible).',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.goForward',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'goForward',
    description: 'Go Forward (If Possible).',
    permission: null,
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.make',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'make',
    description: 'Make a new object.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        new: {
          description: 'The class of the new object.',
          type: 'string',
        },
        at: {
          description: 'The location at which to insert the object.',
          type: 'string',
        },
        withData: {
          description: 'The initial contents of the object.',
          type: 'string',
        },
        withProperties: {
          description: 'The initial values for properties of the object.',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['new'],
    },
  },
  {
    name: 'google-chrome.app.move',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'move',
    description: 'Move object(s) to a new location.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'The new location for the object(s).',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['to'],
    },
  },
  {
    name: 'google-chrome.app.open',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'open',
    description: 'Open a document.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.pasteSelection',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'pasteSelection',
    description: 'Paste text (If Possible).',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.print',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'print',
    description: 'Print an object.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.quit',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'quit',
    description: 'Quit the application.',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.redo',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'redo',
    description: 'Redo the last change.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.reload',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'reload',
    description: 'Reload a tab.',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.save',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'save',
    description: 'Save an object.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        in: {
          description: 'The file in which to save the object.',
          type: 'string',
        },
        as: {
          description:
            "The file type in which to save the data. Can be 'only html', 'complete html', or 'single file'; default is 'complete html'.",
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.selectAll',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'selectAll',
    description: 'Select all.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.stop',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'stop',
    description: 'Stop the current tab from loading.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.undo',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'undo',
    description: 'Undo the last change.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'google-chrome.app.viewSource',
    app: 'google-chrome',
    appBundleId: 'com.google.Chrome',
    resource: 'app',
    operation: 'viewSource',
    description: 'View the HTML source of the tab.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
