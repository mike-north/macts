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
]
