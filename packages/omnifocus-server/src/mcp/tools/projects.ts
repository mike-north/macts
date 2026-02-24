/**
 * MCP tools for Omnifocus.app projects operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all projects
 */
export const projectsListTool: McpToolDefinition = {
  name: 'macts__omnifocus__projects_list',
  description: 'List all projects',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.projects.list()
  },
}

/**
 * Get a project by ID
 */
export const projectsGetTool: McpToolDefinition = {
  name: 'macts__omnifocus__projects_get',
  description: 'Get a project by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Project identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  handler: async (args) => {
    const { id } = args as { id: string }
    const client = getClient()
    return client.projects.get(id)
  },
}

/**
 * Create a new project
 */
export const projectsCreateTool: McpToolDefinition = {
  name: 'macts__omnifocus__projects_create',
  description: 'Create a new project',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Project name',
        type: 'string',
      },
      note: {
        description: 'Project note',
        type: 'string',
      },
      status: {
        description: 'Project status',
        type: 'string',
      },
      flagged: {
        description: 'True if flagged',
        type: 'boolean',
      },
      deferDate: {
        description: 'When the project should become available for action',
        type: 'string',
      },
      plannedDate: {
        description: 'The date at which work for this project is intended',
        type: 'string',
      },
      dueDate: {
        description: 'When the project must be finished',
        type: 'string',
      },
      completionDate: {
        description: "The project's date of completion",
        type: 'string',
      },
      droppedDate: {
        description: 'The date the project was dropped',
        type: 'string',
      },
      creationDate: {
        description: 'When the project was created',
        type: 'string',
      },
      lastReviewDate: {
        description: 'When the project was last reviewed',
        type: 'string',
      },
      nextReviewDate: {
        description: 'When the project should next be reviewed',
        type: 'string',
      },
      estimatedMinutes: {
        description: 'The estimated time, in whole minutes, that this project will take to finish',
        type: 'number',
      },
      sequential: {
        description: 'If true, any children are sequentially dependent',
        type: 'boolean',
      },
      completedByChildren: {
        description: 'If true, complete when children are completed',
        type: 'boolean',
      },
      singletonActionHolder: {
        description: 'True if the project contains singleton actions',
        type: 'boolean',
      },
      defaultSingletonActionHolder: {
        description: 'True if the project is the default holder of singleton actions',
        type: 'boolean',
      },
    },
    additionalProperties: false,
    required: [
      'name',
      'flagged',
      'deferDate',
      'plannedDate',
      'dueDate',
      'completionDate',
      'droppedDate',
      'creationDate',
      'lastReviewDate',
      'nextReviewDate',
      'estimatedMinutes',
      'sequential',
      'completedByChildren',
      'singletonActionHolder',
      'defaultSingletonActionHolder',
    ],
  },
  handler: async (args) => {
    const client = getClient()
    return client.projects.create(args as Record<string, unknown>)
  },
}
