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

    const client = getClient()
    return client.events.list(calendarId)
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
      calendarId: {
        description: 'Calendar identifier (the calendar containing the event)',
        type: 'string',
      },
      id: {
        description: 'Event identifier (uid)',
        type: 'string',
      },
      uid: {
        description: 'A unique event key',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['calendarId', 'id'],
  },
  handler: async (args) => {
    const { calendarId, id } = args as { calendarId: string; id: string; uid?: string }
    const client = getClient()
    return client.events.get(
      calendarId as unknown as Parameters<typeof client.events.get>[0],
      id as unknown as Parameters<typeof client.events.get>[1]
    )
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
        description: 'The iCalendar (RFC 2445) recurrence string',
        type: 'string',
      },
      status: {
        description: 'Event status',
        type: 'string',
      },
      stampDate: {
        description: 'Event modification date',
        type: 'string',
      },
      excludedDates: {
        description: 'Exception dates for recurring events',
        type: 'array',
        items: {
          type: 'string',
        },
      },
      url: {
        description: 'URL associated with the event',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['calendarId', 'summary', 'startDate', 'endDate'],
  },
  handler: async (args) => {
    const client = getClient()
    return client.events.create(args as Parameters<typeof client.events.create>[0])
  },
}

/**
 * Update an existing event
 */
export const eventsUpdateTool: McpToolDefinition = {
  name: 'macts__calendar__events_update',
  description: 'Update an existing event',
  inputSchema: {
    type: 'object',
    properties: {
      calendarId: {
        description: 'Calendar identifier (the calendar containing the event)',
        type: 'string',
      },
      id: {
        description: 'Event identifier (uid)',
        type: 'string',
      },
      summary: {
        description: 'Event title',
        type: 'string',
      },
      description: {
        description: 'Event notes',
        type: 'string',
      },
      location: {
        description: 'Event location',
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
      alldayEvent: {
        description: 'Whether this is an all-day event',
        type: 'boolean',
      },
      recurrence: {
        description: 'The iCalendar (RFC 2445) recurrence string',
        type: 'string',
      },
      status: {
        description: 'Event status',
        type: 'string',
      },
      stampDate: {
        description: 'Event modification date',
        type: 'string',
      },
      excludedDates: {
        description: 'Exception dates for recurring events',
        type: 'array',
        items: {
          type: 'string',
        },
      },
      url: {
        description: 'URL associated with the event',
        type: 'string',
      },
      uid: {
        description: 'A unique event key',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['calendarId', 'id'],
  },
  handler: async (args) => {
    const {
      calendarId: calendarId,
      id: id,
      ...updateFields
    } = args as {
      calendarId: string
      id: string
      summary?: string
      description?: string
      location?: string
      startDate?: string
      endDate?: string
      alldayEvent?: boolean
      recurrence?: string
      status?: string
      stampDate?: string
      excludedDates?: string[]
      url?: string
      uid?: string
    }
    const client = getClient()
    return client.events.update(
      calendarId as unknown as Parameters<typeof client.events.update>[0],
      id as unknown as Parameters<typeof client.events.update>[1],
      updateFields as unknown as Parameters<typeof client.events.update>[2]
    )
  },
}

/**
 * Delete an event by ID
 */
export const eventsDeleteTool: McpToolDefinition = {
  name: 'macts__calendar__events_delete',
  description: 'Delete an event by ID',
  inputSchema: {
    type: 'object',
    properties: {
      calendarId: {
        description: 'Calendar identifier (the calendar containing the event)',
        type: 'string',
      },
      id: {
        description: 'Event identifier (uid)',
        type: 'string',
      },
      uid: {
        description: 'A unique event key',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['calendarId', 'id'],
  },
  handler: async (args) => {
    const { calendarId, id } = args as { calendarId: string; id: string; uid?: string }
    const client = getClient()
    await client.events.delete(
      calendarId as unknown as Parameters<typeof client.events.delete>[0],
      id as unknown as Parameters<typeof client.events.delete>[1]
    )
    return { success: true, message: `Deleted Event ${id}` }
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
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.events.show()
    return { success: true }
  },
}
