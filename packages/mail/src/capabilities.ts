/**
 * Machine-readable capability metadata for Mail.
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
 * Every capability exposed by Mail, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'mail.app.checkForNewMail',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'app',
    operation: 'checkForNewMail',
    description: 'Triggers a check for email.',
    permission: null,
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {
        for: {
          description: 'Specify the account that you wish to check for mail',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'mail.app.delete',
    app: 'mail',
    appBundleId: 'com.apple.mail',
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
    name: 'mail.app.duplicate',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'app',
    operation: 'duplicate',
    description: 'Copy an object.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'The location for the new copy or copies.',
          type: 'string',
        },
        withProperties: {
          description: 'Properties to set in the new copy or copies right away.',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'mail.app.extractAddressFrom',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'app',
    operation: 'extractAddressFrom',
    description:
      'Command to get just the email address of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "jdoe@example.com"',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'mail.app.extractNameFrom',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'app',
    operation: 'extractNameFrom',
    description:
      'Command to get the full name out of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "John Doe"',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'mail.app.getURL',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'app',
    operation: 'getURL',
    description: 'Opens a mailto URL.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'mail.app.importMailMailbox',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'app',
    operation: 'importMailMailbox',
    description: 'Imports a mailbox created by Mail.',
    permission: null,
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {
        at: {
          description: 'the mailbox or folder of mailboxes to import',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['at'],
    },
  },
  {
    name: 'mail.app.mailto',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'app',
    operation: 'mailto',
    description: 'Opens a mailto URL.',
    permission: null,
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'mail.app.move',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'app',
    operation: 'move',
    description: 'Move an object to a new location.',
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
    name: 'mail.app.performMailActionWithMessages',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'app',
    operation: 'performMailActionWithMessages',
    description:
      'Script handler invoked by rules and menus that execute AppleScripts. The direct parameter of this handler is a list of messages being acted upon.',
    permission: null,
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {
        inMailboxes: {
          description:
            'If the script is being executed by the user selecting an item in the scripts menu, this argument will specify the mailboxes that are currently selected. Otherwise it will not be specified.',
          type: 'string',
        },
        forRule: {
          description:
            'If the script is being executed by a rule action, this argument will be the rule being invoked. Otherwise it will not be specified.',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'mail.app.synchronize',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'app',
    operation: 'synchronize',
    description: 'Command to trigger synchronizing of an IMAP account with the server.',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {
        with: {
          description: 'The account to synchronize',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['with'],
    },
  },
  {
    name: 'mail.messages.bounce',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'messages',
    operation: 'bounce',
    description: 'Does nothing at all (deprecated)',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'mail.messages.forward',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'messages',
    operation: 'forward',
    description: 'Creates a forwarded message.',
    permission: null,
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {
        openingWindow: {
          description:
            'Whether the window for the forwarded message is shown. Default is to not show the window.',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'mail.messages.redirect',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'messages',
    operation: 'redirect',
    description: 'Creates a redirected message.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        openingWindow: {
          description:
            'Whether the window for the redirected message is shown. Default is to not show the window.',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'mail.messages.reply',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'messages',
    operation: 'reply',
    description: 'Creates a reply message.',
    permission: null,
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {
        openingWindow: {
          description:
            'Whether the window for the reply message is shown. Default is to not show the window.',
          type: 'boolean',
        },
        replyToAll: {
          description:
            'Whether to reply to all recipients. Default is to reply to the sender only.',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'mail.outgoingmessages.send',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'outgoingmessages',
    operation: 'send',
    description: 'Sends a message.',
    permission: null,
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
