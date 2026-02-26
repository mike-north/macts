/**
 * MCP tools for Calendar.app calendars operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all calendars
 */
export const calendarsListTool: McpToolDefinition = {
  name: 'macts__calendar__calendars_list',
  description: 'List all calendars',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.calendars.list();
  },
};

/**
 * Get a calendar by ID
 */
export const calendarsGetTool: McpToolDefinition = {
  name: 'macts__calendar__calendars_get',
  description: 'Get a calendar by ID',
  inputSchema: {
    "type": "object",
    "properties": {
      "calendarIdentifier": {
        "description": "Calendar identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "calendarIdentifier"
    ]
  },
  handler: async (args) => {
    const { calendarIdentifier } = args as { calendarIdentifier: string };
    const client = getClient();
    return client.calendars.get(calendarIdentifier);
  },
};

/**
 * Create a new calendar
 */
export const calendarsCreateTool: McpToolDefinition = {
  name: 'macts__calendar__calendars_create',
  description: 'Create a new calendar',
  inputSchema: {
    "type": "object",
    "properties": {
      "name": {
        "description": "Calendar name",
        "type": "string"
      },
      "color": {
        "description": "Calendar color",
        "type": "object"
      },
      "title": {
        "description": "The calendar title (synonym for name)",
        "type": "string"
      },
      "description": {
        "description": "The calendar description",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "name",
      "title",
      "description"
    ]
  },
  handler: async (args) => {
    const client = getClient();
    return client.calendars.create(args as Record<string, unknown>);
  },
};

/**
 * Delete a calendar
 */
export const calendarsDeleteTool: McpToolDefinition = {
  name: 'macts__calendar__calendars_delete',
  description: 'Delete a calendar',
  inputSchema: {
    "type": "object",
    "properties": {
      "calendarIdentifier": {
        "description": "Calendar identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "calendarIdentifier"
    ]
  },
  handler: async (args) => {
    const { calendarIdentifier } = args as { calendarIdentifier: string };
    const client = getClient();
    await client.calendars.delete(calendarIdentifier);
    return { success: true, message: `Deleted Calendar ${calendarIdentifier}` };
  },
};

