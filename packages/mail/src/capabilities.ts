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
    permission: 'mail:app:checkForNewMail',
    risk: 'send',
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
    permission: 'mail:app:duplicate',
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
    permission: 'mail:app:extractAddressFrom',
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
    permission: 'mail:app:extractNameFrom',
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
    permission: 'mail:app:getURL',
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
    permission: 'mail:app:importMailMailbox',
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
    permission: 'mail:app:mailto',
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
    permission: 'mail:app:move',
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
    permission: 'mail:app:performMailActionWithMessages',
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'mail.messages.bounce',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'messages',
    operation: 'bounce',
    description: 'Does nothing at all (deprecated)',
    permission: 'mail:messages:bounce',
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
    permission: 'mail:messages:forward',
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
    permission: 'mail:messages:redirect',
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
    permission: 'mail:messages:reply',
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
    name: 'mail.outgoingMessages.send',
    app: 'mail',
    appBundleId: 'com.apple.mail',
    resource: 'outgoingMessages',
    operation: 'send',
    description: 'Sends a message.',
    permission: 'mail:outgoingMessages:send',
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
