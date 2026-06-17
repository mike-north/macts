/**
 * API plugin for Calendar.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for Calendar.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Calendar.app automation.
 */
export const calendarApiPlugin = {
  name: 'calendar',
  bundleId: 'com.apple.iCal',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.apple.iCal',
      name: 'Calendar',
      displayName: 'Calendar',
      tccEntitlements: ['calendar', 'automation'],
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
        name: 'iCal',
        description: 'iCal classes and commands',
        code: 'wrbt',
        resources: [
          'Calendar',
          'Event',
          'Attendee',
          'DisplayAlarm',
          'MailAlarm',
          'SoundAlarm',
          'OpenFileAlarm',
        ],
        commands: ['reloadCalendars', 'switchView', 'viewCalendar', 'show'],
        enums: ['ParticipationStatus', 'EventStatus', 'CalendarPriority', 'ViewType'],
      },
    ],
    resources: {
      Calendar: {
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar containing events',
        code: 'wres',
        properties: {
          name: {
            access: 'rw',
            type: 'string',
            description: 'The calendar title',
            code: 'pnam',
            optional: false,
          },
          title: {
            access: 'rw',
            type: 'string',
            description: 'The calendar title (synonym for name)',
            code: 'wr02',
            optional: false,
            deprecated: {
              message: "Use 'name' instead",
            },
          },
          color: {
            access: 'rw',
            type: 'rgb',
            description: 'The calendar color',
            code: 'colr',
            optional: false,
          },
          calendarIdentifier: {
            access: 'r',
            type: 'string',
            description: 'A unique calendar key',
            code: 'ID  ',
            optional: false,
          },
          writable: {
            access: 'r',
            type: 'boolean',
            description: 'Whether the calendar can be modified',
            code: 'wr05',
            optional: false,
          },
          description: {
            access: 'rw',
            type: 'string',
            description: 'The calendar description',
            code: 'wr12',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'name',
            primary: true,
            targeting: 'byProperty',
          },
        ],
      },
      Event: {
        name: 'Event',
        plural: 'Events',
        description: 'A calendar event',
        code: 'wrev',
        properties: {
          summary: {
            access: 'rw',
            type: 'string',
            description: 'The event summary/title',
            code: 'wr11',
            optional: false,
          },
          description: {
            access: 'rw',
            type: 'string',
            description: 'The event notes',
            code: 'wr12',
            optional: false,
          },
          location: {
            access: 'rw',
            type: 'string',
            description: 'The event location',
            code: 'wr14',
            optional: false,
          },
          startDate: {
            access: 'rw',
            type: 'date',
            description: 'The event start date',
            code: 'wr1s',
            optional: false,
          },
          endDate: {
            access: 'rw',
            type: 'date',
            description: 'The event end date',
            code: 'wr5s',
            optional: false,
          },
          alldayEvent: {
            access: 'rw',
            type: 'boolean',
            description: 'True if the event is an all-day event',
            code: 'wrad',
            optional: false,
          },
          recurrence: {
            access: 'rw',
            type: 'string',
            description:
              'The iCalendar (RFC 2445) string describing the event recurrence, if defined',
            code: 'wr15',
            optional: false,
          },
          status: {
            access: 'rw',
            type: {
              enum: 'EventStatus',
            },
            description: 'The event status',
            code: 'wre4',
            optional: false,
          },
          sequence: {
            access: 'r',
            type: 'integer',
            description: 'The event version',
            code: 'wr13',
            optional: false,
          },
          stampDate: {
            access: 'rw',
            type: 'date',
            description: 'The event modification date',
            code: 'wr4s',
            optional: false,
          },
          excludedDates: {
            access: 'rw',
            type: {
              array: 'date',
            },
            description: 'The exception dates for recurring events',
            code: 'wr2s',
            optional: false,
          },
          uid: {
            access: 'r',
            type: 'string',
            description: 'A unique event key',
            code: 'ID  ',
            optional: false,
          },
          url: {
            access: 'rw',
            type: 'string',
            description: 'The URL associated with the event',
            code: 'wr16',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'uid',
            primary: true,
          },
        ],
      },
      Attendee: {
        name: 'Attendee',
        plural: 'Attendees',
        description: 'An event attendee',
        code: 'wrea',
        properties: {
          displayName: {
            access: 'r',
            type: 'string',
            description: 'The first and last name of the attendee',
            code: 'wra1',
            optional: false,
          },
          email: {
            access: 'r',
            type: 'string',
            description: 'Email address of the attendee',
            code: 'wra2',
            optional: false,
          },
          participationStatus: {
            access: 'r',
            type: {
              enum: 'ParticipationStatus',
            },
            description: 'The invitation status for the attendee',
            code: 'wra3',
            optional: false,
          },
        },
      },
      DisplayAlarm: {
        name: 'DisplayAlarm',
        plural: 'DisplayAlarms',
        description: 'A message/display alarm',
        code: 'wal1',
        properties: {
          triggerInterval: {
            access: 'rw',
            type: 'integer',
            description:
              'The interval in minutes between the event and the alarm (positive for after, negative for before)',
            code: 'wald',
            optional: false,
          },
          triggerDate: {
            access: 'rw',
            type: 'date',
            description: 'An absolute alarm date',
            code: 'wale',
            optional: false,
          },
        },
      },
      MailAlarm: {
        name: 'MailAlarm',
        plural: 'MailAlarms',
        description: 'A mail/email alarm',
        code: 'wal2',
        properties: {
          triggerInterval: {
            access: 'rw',
            type: 'integer',
            description:
              'The interval in minutes between the event and the alarm (positive for after, negative for before)',
            code: 'wald',
            optional: false,
          },
          triggerDate: {
            access: 'rw',
            type: 'date',
            description: 'An absolute alarm date',
            code: 'wale',
            optional: false,
          },
        },
      },
      SoundAlarm: {
        name: 'SoundAlarm',
        plural: 'SoundAlarms',
        description: 'A sound alarm',
        code: 'wal4',
        properties: {
          triggerInterval: {
            access: 'rw',
            type: 'integer',
            description:
              'The interval in minutes between the event and the alarm (positive for after, negative for before)',
            code: 'wald',
            optional: false,
          },
          triggerDate: {
            access: 'rw',
            type: 'date',
            description: 'An absolute alarm date',
            code: 'wale',
            optional: false,
          },
          soundName: {
            access: 'rw',
            type: 'string',
            description: 'The system sound name to be used for the alarm',
            code: 'wals',
            optional: false,
          },
          soundFile: {
            access: 'rw',
            type: 'string',
            description: 'The (POSIX) path to the sound file to be used for the alarm',
            code: 'walf',
            optional: false,
          },
        },
      },
      OpenFileAlarm: {
        name: 'OpenFileAlarm',
        plural: 'OpenFileAlarms',
        description: "An 'open file' alarm",
        code: 'wal3',
        properties: {
          triggerInterval: {
            access: 'rw',
            type: 'integer',
            description:
              'The interval in minutes between the event and the alarm (positive for after, negative for before)',
            code: 'wald',
            optional: false,
            deprecated: {
              message:
                'Starting with OS X 10.14, it is not possible to create new open file alarms. Trying to save or modify an open file alarm will result in a save error.',
              since: '10.14',
            },
          },
          triggerDate: {
            access: 'rw',
            type: 'date',
            description: 'An absolute alarm date',
            code: 'wale',
            optional: false,
            deprecated: {
              message:
                'Starting with OS X 10.14, it is not possible to create new open file alarms. Trying to save or modify an open file alarm will result in a save error.',
              since: '10.14',
            },
          },
          filepath: {
            access: 'rw',
            type: 'string',
            description: 'The (POSIX) path to be opened by the alarm',
            code: 'walp',
            optional: false,
            deprecated: {
              message:
                'Starting with OS X 10.14, it is not possible to view URLs for existing open file alarms',
              since: '10.14',
            },
          },
        },
      },
    },
    enums: {
      ParticipationStatus: {
        name: 'ParticipationStatus',
        description: "Status of an attendee's response to an invitation",
        code: 'wre6',
        values: [
          {
            name: 'unknown',
            value: 'unknown',
            description: 'No answer yet',
            code: 'E6na',
          },
          {
            name: 'accepted',
            value: 'accepted',
            description: 'Invitation has been accepted',
            code: 'E6ap',
          },
          {
            name: 'declined',
            value: 'declined',
            description: 'Invitation has been declined',
            code: 'E6dp',
          },
          {
            name: 'tentative',
            value: 'tentative',
            description: 'Invitation has been tentatively accepted',
            code: 'E6tp',
          },
        ],
      },
      EventStatus: {
        name: 'EventStatus',
        description: 'Status of a calendar event',
        code: 'wre4',
        values: [
          {
            name: 'cancelled',
            value: 'cancelled',
            description: 'A cancelled event',
            code: 'E4ca',
          },
          {
            name: 'confirmed',
            value: 'confirmed',
            description: 'A confirmed event',
            code: 'E4cn',
          },
          {
            name: 'none',
            value: 'none',
            description: 'An event without status',
            code: 'E4no',
          },
          {
            name: 'tentative',
            value: 'tentative',
            description: 'A tentative event',
            code: 'E4te',
          },
        ],
      },
      CalendarPriority: {
        name: 'CalendarPriority',
        description: 'Priority level for calendar items',
        code: 'wrp1',
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
      ViewType: {
        name: 'ViewType',
        description: 'Calendar view type',
        code: 'wre5',
        values: [
          {
            name: 'dayView',
            value: 'dayView',
            description: 'The iCal day view',
            code: 'E5da',
          },
          {
            name: 'weekView',
            value: 'weekView',
            description: 'The iCal week view',
            code: 'E5we',
          },
          {
            name: 'monthView',
            value: 'monthView',
            description: 'The iCal month view',
            code: 'E5mo',
          },
        ],
      },
    },
    hierarchy: {
      children: {
        calendars: {
          resource: 'Calendar',
          access: 'rw',
          description: 'Calendars in the application',
          children: {
            events: {
              resource: 'Event',
              access: 'rw',
              description: 'Events within a calendar',
              children: {
                attendees: {
                  resource: 'Attendee',
                  access: 'r',
                  description: 'Attendees of an event',
                },
                displayAlarms: {
                  resource: 'DisplayAlarm',
                  access: 'rw',
                  description: 'Display alarms for an event',
                },
                mailAlarms: {
                  resource: 'MailAlarm',
                  access: 'rw',
                  description: 'Mail alarms for an event',
                },
                soundAlarms: {
                  resource: 'SoundAlarm',
                  access: 'rw',
                  description: 'Sound alarms for an event',
                },
                openFileAlarms: {
                  resource: 'OpenFileAlarm',
                  access: 'rw',
                  description: 'Open file alarms for an event (deprecated)',
                },
              },
            },
          },
        },
      },
    },
    relationships: [],
    commands: {
      list: {
        name: 'list',
        description: 'List all calendars',
        scope: 'resource',
        resourceType: 'Calendar',
        parameters: [],
        code: 'core',
        permission: 'calendar:calendars:list',
      },
      get: {
        name: 'get',
        description: 'Get a calendar by ID',
        scope: 'resource',
        resourceType: 'Calendar',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Calendar identifier',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'calendar:calendars:get',
      },
      create: {
        name: 'create',
        description: 'Create a new calendar',
        scope: 'resource',
        resourceType: 'Calendar',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'Calendar name',
            required: true,
          },
          {
            name: 'color',
            type: 'rgb',
            description: 'Calendar color',
            required: false,
          },
        ],
        code: 'crel',
        permission: 'calendar:calendars:create',
      },
      listEvents: {
        name: 'list',
        description: 'List all events in a calendar',
        scope: 'resource',
        resourceType: 'Event',
        parameters: [
          {
            name: 'calendarId',
            type: 'string',
            description: 'Calendar identifier',
            required: true,
          },
        ],
        code: 'core',
        permission: 'calendar:events:list',
      },
      getEvent: {
        name: 'get',
        description: 'Get an event by ID',
        scope: 'resource',
        resourceType: 'Event',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Event identifier',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'calendar:events:get',
      },
      createEvent: {
        name: 'create',
        description: 'Create a new event',
        scope: 'resource',
        resourceType: 'Event',
        parameters: [
          {
            name: 'calendarId',
            type: 'string',
            description: 'Calendar identifier for the event',
            required: true,
          },
          {
            name: 'summary',
            type: 'string',
            description: 'Event title',
            required: true,
          },
          {
            name: 'startDate',
            type: 'date',
            description: 'Event start date',
            required: true,
          },
          {
            name: 'endDate',
            type: 'date',
            description: 'Event end date',
            required: true,
          },
          {
            name: 'location',
            type: 'string',
            description: 'Event location',
            required: false,
          },
          {
            name: 'description',
            type: 'string',
            description: 'Event notes',
            required: false,
          },
          {
            name: 'alldayEvent',
            type: 'boolean',
            description: 'Whether this is an all-day event',
            required: false,
          },
          {
            name: 'recurrence',
            type: 'string',
            description: 'The iCalendar (RFC 2445) recurrence string',
            required: false,
          },
          {
            name: 'status',
            type: 'string',
            description: 'Event status (cancelled/confirmed/none/tentative)',
            required: false,
          },
          {
            name: 'stampDate',
            type: 'date',
            description: 'Event modification date',
            required: false,
          },
          {
            name: 'excludedDates',
            type: 'string',
            description: 'Comma-separated exception dates for recurring events (ISO 8601)',
            required: false,
          },
          {
            name: 'url',
            type: 'string',
            description: 'URL associated with the event',
            required: false,
          },
        ],
        code: 'crel',
        permission: 'calendar:events:create',
      },
      updateEvent: {
        name: 'update',
        description: 'Update an existing event',
        scope: 'resource',
        resourceType: 'Event',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Event identifier (uid)',
            required: true,
          },
          {
            name: 'summary',
            type: 'string',
            description: 'Event title',
            required: false,
          },
          {
            name: 'description',
            type: 'string',
            description: 'Event notes',
            required: false,
          },
          {
            name: 'location',
            type: 'string',
            description: 'Event location',
            required: false,
          },
          {
            name: 'startDate',
            type: 'date',
            description: 'Event start date',
            required: false,
          },
          {
            name: 'endDate',
            type: 'date',
            description: 'Event end date',
            required: false,
          },
          {
            name: 'alldayEvent',
            type: 'boolean',
            description: 'Whether this is an all-day event',
            required: false,
          },
          {
            name: 'recurrence',
            type: 'string',
            description: 'The iCalendar (RFC 2445) recurrence string',
            required: false,
          },
          {
            name: 'status',
            type: 'string',
            description: 'Event status (cancelled/confirmed/none/tentative)',
            required: false,
          },
          {
            name: 'stampDate',
            type: 'date',
            description: 'Event modification date',
            required: false,
          },
          {
            name: 'url',
            type: 'string',
            description: 'URL associated with the event',
            required: false,
          },
        ],
        code: '????',
        permission: 'calendar:events:update',
      },
      deleteEvent: {
        name: 'delete',
        description: 'Delete an event by ID',
        scope: 'resource',
        resourceType: 'Event',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Event identifier (uid)',
            required: true,
          },
        ],
        code: 'dele',
        permission: 'calendar:events:delete',
      },
      reloadCalendars: {
        name: 'reloadCalendars',
        description: 'Tell the application to reload all calendar files contents',
        scope: 'application',
        parameters: [],
        code: 'aec8',
        permission: 'calendar:calendars:reload',
      },
      switchView: {
        name: 'switchView',
        description: 'Show calendar on the given view',
        scope: 'application',
        parameters: [
          {
            name: 'to',
            type: 'ViewType',
            description: 'The calendar view to be displayed',
            required: true,
            code: 'wre5',
          },
        ],
        code: 'aeca',
        permission: 'calendar:app:switchView',
      },
      viewCalendar: {
        name: 'viewCalendar',
        description: 'Show calendar on the given date',
        scope: 'application',
        parameters: [
          {
            name: 'at',
            type: 'date',
            description: 'The date to be displayed',
            required: true,
            code: 'wtdt',
          },
        ],
        code: 'aec9',
        permission: 'calendar:app:viewCalendar',
      },
      show: {
        name: 'show',
        description: 'Show the event or to-do in the calendar window',
        scope: 'resource',
        resourceType: 'Event',
        parameters: [],
        code: 'aec3',
        permission: 'calendar:events:show',
      },
    },
    permissions: {
      calendars: {
        read: ['calendar:calendars:list', 'calendar:calendars:get', 'calendar:calendars:reload'],
        create: ['calendar:calendars:create'],
        write: ['calendar:calendars:update'],
        delete: ['calendar:calendars:delete'],
      },
      events: {
        read: ['calendar:events:list', 'calendar:events:get', 'calendar:events:show'],
        create: ['calendar:events:create'],
        write: ['calendar:events:update'],
        delete: ['calendar:events:delete'],
      },
      attendees: {
        read: ['calendar:attendees:list', 'calendar:attendees:get'],
      },
      displayAlarms: {
        read: ['calendar:displayAlarms:list', 'calendar:displayAlarms:get'],
        create: ['calendar:displayAlarms:create'],
        write: ['calendar:displayAlarms:update'],
        delete: ['calendar:displayAlarms:delete'],
      },
      mailAlarms: {
        read: ['calendar:mailAlarms:list', 'calendar:mailAlarms:get'],
        create: ['calendar:mailAlarms:create'],
        write: ['calendar:mailAlarms:update'],
        delete: ['calendar:mailAlarms:delete'],
      },
      soundAlarms: {
        read: ['calendar:soundAlarms:list', 'calendar:soundAlarms:get'],
        create: ['calendar:soundAlarms:create'],
        write: ['calendar:soundAlarms:update'],
        delete: ['calendar:soundAlarms:delete'],
      },
      openFileAlarms: {
        read: ['calendar:openFileAlarms:list', 'calendar:openFileAlarms:get'],
        create: ['calendar:openFileAlarms:create'],
        write: ['calendar:openFileAlarms:update'],
        delete: ['calendar:openFileAlarms:delete'],
      },
      app: {
        read: ['calendar:app:switchView', 'calendar:app:viewCalendar'],
      },
    },
    extraction: {
      sourceFile: 'source.sdef',
      confidence: {
        overall: 0.95,
        fields: {
          resources: 1,
          enums: 1,
          hierarchy: 0.95,
          commands: 0.95,
        },
      },
      openQuestions: [
        {
          question:
            'Should CalendarPriority enum be exposed or is it unused in modern Calendar.app?',
          context: 'The enum is defined in the SDEF but no properties reference it',
          relatedTo: 'CalendarPriority',
        },
        {
          question:
            'Are there additional Standard Suite commands (like make, delete, save) that should be explicitly documented?',
          context: 'Standard Suite is included via xi:include reference',
          suggestions: [
            'Include standard commands explicitly',
            'Reference Standard Suite documentation separately',
          ],
        },
      ],
    },
  } as AppManifest,
} as const
