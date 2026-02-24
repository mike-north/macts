/**
 * MCP tools for Calendar.app events operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all events in a calendar
 */
export const eventsListTool: McpToolDefinition = {
  name: 'macts__calendar__events_list',
  description: 'List all events in a calendar',
  inputSchema: {
    type: 'object',
    properties: {
      calendarId: {
        description: 'Calendar identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['calendarId'],
  },
  handler: async (args) => {
    const { calendarId } = args as { calendarId: string }
    void calendarId
    const client = getClient()
    return client.events.list()
  },
}

/**
 * Get an event by ID
 */
export const eventsGetTool: McpToolDefinition = {
  name: 'macts__calendar__events_get',
  description: 'Get an event by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Event identifier',
        type: 'string',
      },
      uid: {
        description: 'A unique event key',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id', 'uid'],
  },
  handler: async (args) => {
    const { id } = args as { id: string; uid: string }
    const client = getClient()
    return client.events.get(id)
  },
}

/**
 * Create a new event
 */
export const eventsCreateTool: McpToolDefinition = {
  name: 'macts__calendar__events_create',
  description: 'Create a new event',
  inputSchema: {
    type: 'object',
    properties: {
      calendarId: {
        description: 'Calendar identifier for the event',
        type: 'string',
      },
      summary: {
        description: 'Event title',
        type: 'string',
      },
      startDate: {
        description: 'Event start date',
        type: 'string',
      },
      endDate: {
        description: 'Event end date',
        type: 'string',
      },
      location: {
        description: 'Event location',
        type: 'string',
      },
      description: {
        description: 'Event notes',
        type: 'string',
      },
      alldayEvent: {
        description: 'Whether this is an all-day event',
        type: 'boolean',
      },
      recurrence: {
        description: 'The iCalendar (RFC 2445) string describing the event recurrence, if defined',
        type: 'string',
      },
      status: {
        description: 'The event status',
        type: 'string',
      },
      stampDate: {
        description: 'The event modification date',
        type: 'string',
      },
      excludedDates: {
        description: 'The exception dates for recurring events',
        type: 'array',
        items: 'string',
      },
      url: {
        description: 'The URL associated with the event',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: [
      'calendarId',
      'summary',
      'startDate',
      'endDate',
      'recurrence',
      'status',
      'stampDate',
      'excludedDates',
      'url',
    ],
  },
  handler: async (args) => {
    const client = getClient()
    return client.events.create(args as Record<string, unknown>)
  },
}

/**
 * Show the event or to-do in the calendar window
 */
export const eventsShowTool: McpToolDefinition = {
  name: 'macts__calendar__events_show',
  description: 'Show the event or to-do in the calendar window',
  inputSchema: {
    type: 'object',
    properties: {
      uid: {
        description: 'A unique event key',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['uid'],
  },
  handler: async (args) => {
    const { uid } = args as { uid: string }
    const client = getClient()
    await client.events.show(uid)
    return { success: true }
  },
}
