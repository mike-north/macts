/**
 * MCP tools for Omnifocus.app tasks operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all tasks
 */
export const tasksListTool: McpToolDefinition = {
  name: 'macts__omnifocus__tasks_list',
  description: 'List all tasks',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.tasks.list();
  },
};

/**
 * Get a task by ID
 */
export const tasksGetTool: McpToolDefinition = {
  name: 'macts__omnifocus__tasks_get',
  description: 'Get a task by ID',
  inputSchema: {
    "type": "object",
    "properties": {
      "id": {
        "description": "Task identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "id"
    ]
  },
  handler: async (args) => {
    const { id } = args as { id: string };
    const client = getClient();
    return client.tasks.get(id);
  },
};

/**
 * Create a new task
 */
export const tasksCreateTool: McpToolDefinition = {
  name: 'macts__omnifocus__tasks_create',
  description: 'Create a new task',
  inputSchema: {
    "type": "object",
    "properties": {
      "name": {
        "description": "Task name",
        "type": "string"
      },
      "note": {
        "description": "Task note",
        "type": "string"
      },
      "deferDate": {
        "description": "Defer date",
        "type": "string"
      },
      "dueDate": {
        "description": "Due date",
        "type": "string"
      },
      "flagged": {
        "description": "True if flagged",
        "type": "boolean"
      },
      "plannedDate": {
        "description": "The date at which work for this task is intended",
        "type": "string"
      },
      "completionDate": {
        "description": "The task's date of completion",
        "type": "string"
      },
      "droppedDate": {
        "description": "The date the task was dropped",
        "type": "string"
      },
      "creationDate": {
        "description": "When the task was created",
        "type": "string"
      },
      "estimatedMinutes": {
        "description": "The estimated time, in whole minutes, that this task will take to finish",
        "type": "number"
      },
      "sequential": {
        "description": "If true, any children are sequentially dependent",
        "type": "boolean"
      },
      "completedByChildren": {
        "description": "If true, complete when children are completed",
        "type": "boolean"
      }
    },
    "additionalProperties": false,
    "required": [
      "name",
      "flagged",
      "plannedDate",
      "completionDate",
      "droppedDate",
      "creationDate",
      "estimatedMinutes",
      "sequential",
      "completedByChildren"
    ]
  },
  handler: async (args) => {
    const client = getClient();
    return client.tasks.create(args as Record<string, unknown>);
  },
};

