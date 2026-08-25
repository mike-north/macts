/**
 * MCP tools for Calendar.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Tell the application to reload all calendar files contents
 */
export const appReloadCalendarsTool: McpToolDefinition = {
  name: 'macts__calendar__app_reload_calendars',
  description: 'Tell the application to reload all calendar files contents',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.reloadCalendars()
    return { success: true }
  },
}

/**
 * Show calendar on the given view
 */
export const appSwitchViewTool: McpToolDefinition = {
  name: 'macts__calendar__app_switch_view',
  description: 'Show calendar on the given view',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        description: 'The calendar view to be displayed',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['to'],
  },
  handler: async (args) => {
    const { to } = args as { to: string }
    const client = getClient()
    await client.switchView(to as unknown as Parameters<typeof client.switchView>[0])
    return { success: true }
  },
}

/**
 * Show calendar on the given date
 */
export const appViewCalendarTool: McpToolDefinition = {
  name: 'macts__calendar__app_view_calendar',
  description: 'Show calendar on the given date',
  inputSchema: {
    type: 'object',
    properties: {
      at: {
        description: 'The date to be displayed',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['at'],
  },
  handler: async (args) => {
    const { at } = args as { at: string }
    const client = getClient()
    await client.viewCalendar(at as unknown as Parameters<typeof client.viewCalendar>[0])
    return { success: true }
  },
}
