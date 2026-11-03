/**
 * Machine-readable capability metadata for Contacts.
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
 * Every capability exposed by Contacts, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'contacts.addresses.get',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'addresses',
    operation: 'get',
    description: 'Get one address of a person by its identifier',
    permission: 'contacts:addresses:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          description: 'Identifier of the person',
          type: 'string',
        },
        id: {
          description: 'Identifier of the address',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['personId', 'id'],
    },
  },
  {
    name: 'contacts.addresses.list',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'addresses',
    operation: 'list',
    description: 'List the addresses of a person',
    permission: 'contacts:addresses:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          description: 'Identifier of the person',
          type: 'string',
        },
        pageSize: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'The most items to return, from 1 to 100 (default 25).',
        },
        cursor: {
          type: 'string',
          description:
            "The previous page's nextCursor, to read the page after it. Omit it to read the first page.",
        },
      },
      additionalProperties: false,
      required: ['personId'],
    },
  },
  {
    name: 'contacts.app.actionProperty',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'app',
    operation: 'actionProperty',
    description:
      'RollOver - Which property this roll over is associated with (Properties can be one of maiden name, phone, email, url, birth date, custom date, related name, aim, icq, jabber, msn, yahoo, address.)',
    permission: 'contacts:app:actionProperty',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'contacts.app.actionTitle',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'app',
    operation: 'actionTitle',
    description: 'RollOver - Returns the title that will be placed in the menu for this roll over',
    permission: 'contacts:app:actionTitle',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        with: {
          description: 'property that that was returned from the "action property" handler.',
          type: 'string',
        },
        for: {
          description: 'Currently selected person.',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['with', 'for'],
    },
  },
  {
    name: 'contacts.app.add',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'app',
    operation: 'add',
    description: 'Add a child object.',
    permission: 'contacts:app:add',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'where to add this child to.',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['to'],
    },
  },
  {
    name: 'contacts.app.make',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'app',
    operation: 'make',
    description: 'Create a new object.',
    permission: 'contacts:app:make',
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
    name: 'contacts.app.performAction',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'app',
    operation: 'performAction',
    description: 'RollOver - Performs the action on the given person and value',
    permission: 'contacts:app:performAction',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        with: {
          description: 'property that that was returned from the "action property" handler.',
          type: 'string',
        },
        for: {
          description: 'Currently selected person.',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['with', 'for'],
    },
  },
  {
    name: 'contacts.app.remove',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'app',
    operation: 'remove',
    description: 'Remove a child object.',
    permission: 'contacts:app:remove',
    risk: 'delete',
    inputSchema: {
      type: 'object',
      properties: {
        from: {
          description: 'where to remove this child from.',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['from'],
    },
  },
  {
    name: 'contacts.app.save',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'app',
    operation: 'save',
    description:
      'Save all Contacts changes. Also see the unsaved property for the application class.',
    permission: 'contacts:app:save',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'contacts.app.shouldEnableAction',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'app',
    operation: 'shouldEnableAction',
    description:
      'RollOver - Determines if the rollover action should be enabled for the given person and value',
    permission: 'contacts:app:shouldEnableAction',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        with: {
          description: 'property that that was returned from the "action property" handler.',
          type: 'string',
        },
        for: {
          description: 'Currently selected person.',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['with', 'for'],
    },
  },
  {
    name: 'contacts.emails.get',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'emails',
    operation: 'get',
    description: 'Get one email address of a person by its identifier',
    permission: 'contacts:emails:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          description: 'Identifier of the person',
          type: 'string',
        },
        id: {
          description: 'Identifier of the email address',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['personId', 'id'],
    },
  },
  {
    name: 'contacts.emails.list',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'emails',
    operation: 'list',
    description: 'List the email addresses of a person',
    permission: 'contacts:emails:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          description: 'Identifier of the person',
          type: 'string',
        },
        pageSize: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'The most items to return, from 1 to 100 (default 25).',
        },
        cursor: {
          type: 'string',
          description:
            "The previous page's nextCursor, to read the page after it. Omit it to read the first page.",
        },
      },
      additionalProperties: false,
      required: ['personId'],
    },
  },
  {
    name: 'contacts.groups.get',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'groups',
    operation: 'get',
    description: 'Get a group by identifier',
    permission: 'contacts:groups:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Identifier of the group',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'contacts.groups.list',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'groups',
    operation: 'list',
    description: 'List every group',
    permission: 'contacts:groups:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'The most items to return, from 1 to 100 (default 25).',
        },
        cursor: {
          type: 'string',
          description:
            "The previous page's nextCursor, to read the page after it. Omit it to read the first page.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'contacts.people.get',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'people',
    operation: 'get',
    description: 'Get a person by identifier',
    permission: 'contacts:people:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Identifier of the person',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'contacts.people.list',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'people',
    operation: 'list',
    description: 'List every person',
    permission: 'contacts:people:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'The most items to return, from 1 to 100 (default 25).',
        },
        cursor: {
          type: 'string',
          description:
            "The previous page's nextCursor, to read the page after it. Omit it to read the first page.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'contacts.phones.get',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'phones',
    operation: 'get',
    description: 'Get one phone number of a person by its identifier',
    permission: 'contacts:phones:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          description: 'Identifier of the person',
          type: 'string',
        },
        id: {
          description: 'Identifier of the phone number',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['personId', 'id'],
    },
  },
  {
    name: 'contacts.phones.list',
    app: 'contacts',
    appBundleId: 'com.apple.AddressBook',
    resource: 'phones',
    operation: 'list',
    description: 'List the phone numbers of a person',
    permission: 'contacts:phones:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          description: 'Identifier of the person',
          type: 'string',
        },
        pageSize: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'The most items to return, from 1 to 100 (default 25).',
        },
        cursor: {
          type: 'string',
          description:
            "The previous page's nextCursor, to read the page after it. Omit it to read the first page.",
        },
      },
      additionalProperties: false,
      required: ['personId'],
    },
  },
]
