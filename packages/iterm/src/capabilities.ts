/**
 * Machine-readable capability metadata for iTerm.
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
 * Every capability exposed by iTerm, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'iterm.app.close',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'close',
    description: 'Close a document.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.count',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
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
    name: 'iterm.app.createHotkeyWindowWithProfile',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'createHotkeyWindowWithProfile',
    description: 'Create a hotkey window',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.createTab',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'createTab',
    description: 'Create a new tab',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        withProfile: {
          description: 'The profile name',
          type: 'string',
        },
        command: {
          description: 'Shell command to run',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['withProfile'],
    },
  },
  {
    name: 'iterm.app.createTabWithDefaultProfile',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'createTabWithDefaultProfile',
    description: 'Create a new tab with the default profile',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          description: 'Shell command to run',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.createWindowWithDefaultProfile',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'createWindowWithDefaultProfile',
    description: 'Create a new window with the default profile',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          description: 'Shell command to run',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.createWindowWithProfile',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'createWindowWithProfile',
    description: 'Create a new window',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          description: 'Shell command to run',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.delete',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
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
    name: 'iterm.app.duplicate',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
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
      required: ['to'],
    },
  },
  {
    name: 'iterm.app.exists',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
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
    name: 'iterm.app.hideHotkeyWindow',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'hideHotkeyWindow',
    description: 'Hides a hotkey window. Only to be called on windows that are hotkey windows.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.invokeAPIExpression',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'invokeAPIExpression',
    description: 'Invokes an expression, such as a registered function.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.launchAPIScriptNamed',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'launchAPIScriptNamed',
    description: 'Launch API script by name',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {
        arguments: {
          description: 'Arguments to pass to script',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.make',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
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
    name: 'iterm.app.move',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
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
    name: 'iterm.app.requestCookie',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'requestCookie',
    description: 'Request a Python API cookie',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        andKeyForAppNamed: {
          description: 'Name of script using the cookie. This is shown in the console.',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.revealHotkeyWindow',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'revealHotkeyWindow',
    description: 'Reveals a hotkey window. Only to be called on windows that are hotkey windows.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.select',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'select',
    description: 'Make receiver visible and selected.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.setVariable',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'setVariable',
    description: 'Sets the value of a session variable',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        named: {
          description: 'Name of variable',
          type: 'string',
        },
        to: {
          description: 'New value',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['named', 'to'],
    },
  },
  {
    name: 'iterm.app.splitHorizontally',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'splitHorizontally',
    description: 'Split a session horizontally.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        withProfile: {
          description: 'Name of profile for new session.',
          type: 'string',
        },
        command: {
          description: 'Shell command to run',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['withProfile'],
    },
  },
  {
    name: 'iterm.app.splitHorizontallyWithDefaultProfile',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'splitHorizontallyWithDefaultProfile',
    description: 'Split a session horizontally, using the default profile for the new session',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          description: 'Shell command to run',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.splitHorizontallyWithSameProfile',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'splitHorizontallyWithSameProfile',
    description:
      "Split a session horizontally, using the original session's profile for the new session",
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          description: 'Shell command to run',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.splitVertically',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'splitVertically',
    description: 'Split a session vertically.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        withProfile: {
          description: 'Name of profile for new session.',
          type: 'string',
        },
        command: {
          description: 'Shell command to run',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['withProfile'],
    },
  },
  {
    name: 'iterm.app.splitVerticallyWithDefaultProfile',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'splitVerticallyWithDefaultProfile',
    description: 'Split a session vertically, using the default profile for the new session',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          description: 'Shell command to run',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.splitVerticallyWithSameProfile',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'splitVerticallyWithSameProfile',
    description:
      "Split a session vertically, using the original session's profile for the new session",
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          description: 'Shell command to run',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.toggleHotkeyWindow',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'toggleHotkeyWindow',
    description:
      'Toggles the visibility of a hotkey window. Only to be called on windows that are hotkey windows.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'iterm.app.variable',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'variable',
    description: 'Returns the value of a session variable with the given name',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        named: {
          description: 'Name of variable',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['named'],
    },
  },
  {
    name: 'iterm.app.write',
    app: 'iterm',
    appBundleId: 'com.googlecode.iterm2',
    resource: 'app',
    operation: 'write',
    description: 'Send text as though it was typed.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        contentsOfFile: {
          description: 'Filename to send the contents of',
          type: 'string',
        },
        text: {
          description: 'Text to send',
          type: 'string',
        },
        newline: {
          description: 'If newline should be added to end of text (default: yes)',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
]
