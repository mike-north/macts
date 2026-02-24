/**
 * API plugin for Reminders.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for Reminders.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Reminders.app automation.
 */
export const remindersApiPlugin = {
  name: 'reminders',
  bundleId: 'com.apple.reminders',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.apple.reminders',
      name: 'Reminders',
      displayName: 'Reminders',
      tccEntitlements: ['reminders', 'automation'],
      distributionModel: 'system',
    },
    suites: [
      {
        name: 'Standard Suite',
        description: 'Common classes and commands for all applications',
        code: '????',
        resources: [],
        commands: [],
        enums: [],
      },
      {
        name: 'Reminders',
        description: 'Reminders classes and commands',
        code: '????',
        resources: ['Account', 'List', 'Reminder'],
        commands: ['show'],
        enums: ['ReminderPriority'],
      },
    ],
    resources: {
      Account: {
        name: 'Account',
        plural: 'Accounts',
        description: 'An account in the Reminders application',
        code: '????',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The name of the account',
            code: 'pnam',
            optional: false,
          },
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the account',
            code: 'ID  ',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'id',
            primary: true,
          },
        ],
      },
      List: {
        name: 'List',
        plural: 'Lists',
        description: 'A list of reminders',
        code: '????',
        properties: {
          name: {
            access: 'rw',
            type: 'string',
            description: 'The name of the list',
            code: 'pnam',
            optional: false,
          },
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the list',
            code: 'ID  ',
            optional: false,
          },
          color: {
            access: 'rw',
            type: 'rgb',
            description: 'The color of the list',
            code: 'colr',
            optional: false,
          },
          emblem: {
            access: 'rw',
            type: 'string',
            description: 'The emblem icon name of the list',
            code: '????',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'id',
            primary: true,
          },
        ],
      },
      Reminder: {
        name: 'Reminder',
        plural: 'Reminders',
        description: 'A reminder item',
        code: '????',
        properties: {
          name: {
            access: 'rw',
            type: 'string',
            description: 'The name of the reminder',
            code: 'pnam',
            optional: false,
          },
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the reminder',
            code: 'ID  ',
            optional: false,
          },
          body: {
            access: 'rw',
            type: 'string',
            description: 'The notes attached to the reminder',
            code: '????',
            optional: false,
          },
          completed: {
            access: 'rw',
            type: 'boolean',
            description: 'Whether the reminder is completed',
            code: '????',
            optional: false,
          },
          completionDate: {
            access: 'r',
            type: 'date',
            description: 'The completion date of the reminder',
            code: '????',
            optional: false,
          },
          dueDate: {
            access: 'rw',
            type: 'date',
            description: 'The due date of the reminder',
            code: '????',
            optional: false,
          },
          remindMeDate: {
            access: 'rw',
            type: 'date',
            description: 'The remind date of the reminder',
            code: '????',
            optional: false,
          },
          priority: {
            access: 'rw',
            type: 'integer',
            description: 'The priority of the reminder (0=none, 1=high, 5=medium, 9=low)',
            code: '????',
            optional: false,
          },
          flagged: {
            access: 'rw',
            type: 'boolean',
            description: 'Whether the reminder is flagged',
            code: '????',
            optional: false,
          },
          creationDate: {
            access: 'r',
            type: 'date',
            description: 'The creation date of the reminder',
            code: '????',
            optional: false,
          },
          modificationDate: {
            access: 'r',
            type: 'date',
            description: 'The modification date of the reminder',
            code: '????',
            optional: false,
          },
          allDayDueDate: {
            access: 'rw',
            type: 'date',
            description: 'The all-day due date of the reminder',
            code: '????',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'id',
            primary: true,
          },
        ],
      },
    },
    enums: {
      ReminderPriority: {
        name: 'ReminderPriority',
        description: 'Priority level for reminders',
        code: '????',
        values: [
          {
            name: 'noPriority',
            value: 0,
            description: 'No priority',
            code: 'tdp0',
          },
          {
            name: 'lowPriority',
            value: 9,
            description: 'Low priority',
            code: 'tdp9',
          },
          {
            name: 'mediumPriority',
            value: 5,
            description: 'Medium priority',
            code: 'tdp5',
          },
          {
            name: 'highPriority',
            value: 1,
            description: 'High priority',
            code: 'tdp1',
          },
        ],
      },
    },
    hierarchy: {
      children: {
        accounts: {
          resource: 'Account',
          access: 'r',
          description: 'Accounts in the application',
        },
        lists: {
          resource: 'List',
          access: 'rw',
          description: 'Reminder lists in the application',
          children: {
            reminders: {
              resource: 'Reminder',
              access: 'rw',
              description: 'Reminders within a list',
            },
          },
        },
      },
    },
    relationships: [],
    commands: {
      list: {
        name: 'list',
        description: 'List all reminder lists',
        scope: 'resource',
        resourceType: 'List',
        parameters: [],
        code: 'core',
        permission: 'reminders:lists:list',
      },
      get: {
        name: 'get',
        description: 'Get a reminder list by ID',
        scope: 'resource',
        resourceType: 'List',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'List identifier',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'reminders:lists:get',
      },
      create: {
        name: 'create',
        description: 'Create a new reminder list',
        scope: 'resource',
        resourceType: 'List',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'List name',
            required: true,
          },
          {
            name: 'color',
            type: 'rgb',
            description: 'List color',
            required: false,
          },
        ],
        code: 'crel',
        permission: 'reminders:lists:create',
      },
      listReminders: {
        name: 'list',
        description: 'List all reminders in a list',
        scope: 'resource',
        resourceType: 'Reminder',
        parameters: [
          {
            name: 'listId',
            type: 'string',
            description: 'List identifier',
            required: true,
          },
        ],
        code: 'core',
        permission: 'reminders:reminders:list',
      },
      getReminder: {
        name: 'get',
        description: 'Get a reminder by ID',
        scope: 'resource',
        resourceType: 'Reminder',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Reminder identifier',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'reminders:reminders:get',
      },
      createReminder: {
        name: 'create',
        description: 'Create a new reminder',
        scope: 'resource',
        resourceType: 'Reminder',
        parameters: [
          {
            name: 'listId',
            type: 'string',
            description: 'List identifier for the reminder',
            required: true,
          },
          {
            name: 'name',
            type: 'string',
            description: 'Reminder name',
            required: true,
          },
          {
            name: 'body',
            type: 'string',
            description: 'Reminder notes',
            required: false,
          },
          {
            name: 'dueDate',
            type: 'date',
            description: 'Due date',
            required: false,
          },
          {
            name: 'remindMeDate',
            type: 'date',
            description: 'Remind me date',
            required: false,
          },
          {
            name: 'priority',
            type: 'integer',
            description: 'Priority (0=none, 1=high, 5=medium, 9=low)',
            required: false,
          },
          {
            name: 'flagged',
            type: 'boolean',
            description: 'Whether to flag the reminder',
            required: false,
          },
        ],
        code: 'crel',
        permission: 'reminders:reminders:create',
      },
      deleteReminder: {
        name: 'delete',
        description: 'Delete a reminder',
        scope: 'resource',
        resourceType: 'Reminder',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Reminder identifier',
            required: true,
          },
        ],
        code: 'dele',
        permission: 'reminders:reminders:delete',
      },
      completeReminder: {
        name: 'complete',
        description: 'Mark a reminder as complete',
        scope: 'resource',
        resourceType: 'Reminder',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Reminder identifier',
            required: true,
          },
        ],
        code: '????',
        permission: 'reminders:reminders:update',
      },
      show: {
        name: 'show',
        description: 'Show the reminder in Reminders.app UI',
        scope: 'resource',
        resourceType: 'Reminder',
        parameters: [],
        code: '????',
        permission: 'reminders:reminders:show',
      },
      listAccounts: {
        name: 'list',
        description: 'List all accounts',
        scope: 'resource',
        resourceType: 'Account',
        parameters: [],
        code: 'core',
        permission: 'reminders:accounts:list',
      },
    },
    permissions: {
      lists: {
        read: ['reminders:lists:list', 'reminders:lists:get'],
        create: ['reminders:lists:create'],
        write: ['reminders:lists:update'],
        delete: ['reminders:lists:delete'],
      },
      reminders: {
        read: ['reminders:reminders:list', 'reminders:reminders:get', 'reminders:reminders:show'],
        create: ['reminders:reminders:create'],
        write: ['reminders:reminders:update'],
        delete: ['reminders:reminders:delete'],
      },
      accounts: {
        read: ['reminders:accounts:list', 'reminders:accounts:get'],
      },
    },
    extraction: {
      sourceFile: 'source.sdef',
      confidence: {
        overall: 0.85,
        fields: {
          resources: 0.95,
          enums: 1,
          hierarchy: 0.95,
          commands: 0.85,
        },
      },
      openQuestions: [
        {
          question: 'What are the exact 4-char codes for Reminders.app resources and properties?',
          context:
            'Placeholder codes used - run sdef /System/Applications/Reminders.app to get exact codes',
          relatedTo: 'all resources',
        },
        {
          question:
            'Does Reminders.app expose an explicit complete command or is it done via setting the completed property?',
          context: 'The completeReminder command may be a convenience wrapper over property update',
          relatedTo: 'completeReminder',
        },
      ],
    },
  } as AppManifest,
} as const
