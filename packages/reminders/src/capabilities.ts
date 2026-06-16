/**
 * Machine-readable capability metadata for Reminders.
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
 * Every capability exposed by Reminders, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'reminders.accounts.list',
    app: 'reminders',
    appBundleId: 'com.apple.reminders',
    resource: 'accounts',
    operation: 'list',
    description: 'List all accounts',
    permission: 'reminders:accounts:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'reminders.lists.create',
    app: 'reminders',
    appBundleId: 'com.apple.reminders',
    resource: 'lists',
    operation: 'create',
    description: 'Create a new reminder list',
    permission: 'reminders:lists:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'List name',
          type: 'string',
        },
        color: {
          description: 'List color',
          type: 'object',
        },
        emblem: {
          description: 'The emblem icon name of the list',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name', 'emblem'],
    },
  },
  {
    name: 'reminders.lists.get',
    app: 'reminders',
    appBundleId: 'com.apple.reminders',
    resource: 'lists',
    operation: 'get',
    description: 'Get a reminder list by ID',
    permission: 'reminders:lists:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'List identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'reminders.lists.list',
    app: 'reminders',
    appBundleId: 'com.apple.reminders',
    resource: 'lists',
    operation: 'list',
    description: 'List all reminder lists',
    permission: 'reminders:lists:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'reminders.reminders.complete',
    app: 'reminders',
    appBundleId: 'com.apple.reminders',
    resource: 'reminders',
    operation: 'complete',
    description: 'Mark a reminder as complete',
    permission: 'reminders:reminders:update',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Reminder identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'reminders.reminders.create',
    app: 'reminders',
    appBundleId: 'com.apple.reminders',
    resource: 'reminders',
    operation: 'create',
    description: 'Create a new reminder',
    permission: 'reminders:reminders:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          description: 'List identifier for the reminder',
          type: 'string',
        },
        name: {
          description: 'Reminder name',
          type: 'string',
        },
        body: {
          description: 'Reminder notes',
          type: 'string',
        },
        dueDate: {
          description: 'Due date',
          type: 'string',
        },
        remindMeDate: {
          description: 'Remind me date',
          type: 'string',
        },
        priority: {
          description: 'Priority (0=none, 1=high, 5=medium, 9=low)',
          type: 'number',
        },
        flagged: {
          description: 'Whether to flag the reminder',
          type: 'boolean',
        },
        completed: {
          description: 'Whether the reminder is completed',
          type: 'boolean',
        },
        allDayDueDate: {
          description: 'The all-day due date of the reminder',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['listId', 'name', 'completed', 'allDayDueDate'],
    },
  },
  {
    name: 'reminders.reminders.delete',
    app: 'reminders',
    appBundleId: 'com.apple.reminders',
    resource: 'reminders',
    operation: 'delete',
    description: 'Delete a reminder',
    permission: 'reminders:reminders:delete',
    risk: 'delete',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Reminder identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'reminders.reminders.get',
    app: 'reminders',
    appBundleId: 'com.apple.reminders',
    resource: 'reminders',
    operation: 'get',
    description: 'Get a reminder by ID',
    permission: 'reminders:reminders:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Reminder identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'reminders.reminders.list',
    app: 'reminders',
    appBundleId: 'com.apple.reminders',
    resource: 'reminders',
    operation: 'list',
    description: 'List all reminders in a list',
    permission: 'reminders:reminders:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          description: 'List identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['listId'],
    },
  },
  {
    name: 'reminders.reminders.show',
    app: 'reminders',
    appBundleId: 'com.apple.reminders',
    resource: 'reminders',
    operation: 'show',
    description: 'Show the reminder in Reminders.app UI',
    permission: 'reminders:reminders:show',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
