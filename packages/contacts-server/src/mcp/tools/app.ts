/**
 * MCP tools for Contacts.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Create a new object.
 */
export const appMakeTool: McpToolDefinition = {
  name: 'macts__contacts__app_make',
  description: 'Create a new object.',
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
  handler: async (args) => {
    const {
      new: _new,
      at,
      withData,
      withProperties,
    } = args as { new: string; at?: string; withData?: string; withProperties?: string }
    const client = getClient()
    await client.make(
      _new as unknown as Parameters<typeof client.make>[0],
      at as unknown as Parameters<typeof client.make>[1],
      withData as unknown as Parameters<typeof client.make>[2],
      withProperties as unknown as Parameters<typeof client.make>[3]
    )
    return { success: true }
  },
}

/**
 * Add a child object.
 */
export const appAddTool: McpToolDefinition = {
  name: 'macts__contacts__app_add',
  description: 'Add a child object.',
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
  handler: async (args) => {
    const { to } = args as { to: string }
    const client = getClient()
    await client.add(to as unknown as Parameters<typeof client.add>[0])
    return { success: true }
  },
}

/**
 * Remove a child object.
 */
export const appRemoveTool: McpToolDefinition = {
  name: 'macts__contacts__app_remove',
  description: 'Remove a child object.',
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
  handler: async (args) => {
    const { from } = args as { from: string }
    const client = getClient()
    await client.remove(from as unknown as Parameters<typeof client.remove>[0])
    return { success: true }
  },
}

/**
 * Save all Contacts changes. Also see the unsaved property for the application class.
 */
export const appSaveTool: McpToolDefinition = {
  name: 'macts__contacts__app_save',
  description:
    'Save all Contacts changes. Also see the unsaved property for the application class.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.save()
    return { success: true }
  },
}

/**
 * RollOver - Which property this roll over is associated with (Properties can be one of maiden name, phone, email, url, birth date, custom date, related name, aim, icq, jabber, msn, yahoo, address.)
 */
export const appActionPropertyTool: McpToolDefinition = {
  name: 'macts__contacts__app_action_property',
  description:
    'RollOver - Which property this roll over is associated with (Properties can be one of maiden name, phone, email, url, birth date, custom date, related name, aim, icq, jabber, msn, yahoo, address.)',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.actionProperty()
    return { success: true }
  },
}

/**
 * RollOver - Returns the title that will be placed in the menu for this roll over
 */
export const appActionTitleTool: McpToolDefinition = {
  name: 'macts__contacts__app_action_title',
  description: 'RollOver - Returns the title that will be placed in the menu for this roll over',
  inputSchema: {
    type: 'object',
    properties: {
      with: {
        description: 'property that that was returned from the "action property" handler.',
        type: 'string',
      },
      for: {
        description: 'Currently selected person.',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['with', 'for'],
  },
  handler: async (args) => {
    const { with: _with, for: _for } = args as { with: string; for: string }
    const client = getClient()
    await client.actionTitle(
      _with as unknown as Parameters<typeof client.actionTitle>[0],
      _for as unknown as Parameters<typeof client.actionTitle>[1]
    )
    return { success: true }
  },
}

/**
 * RollOver - Performs the action on the given person and value
 */
export const appPerformActionTool: McpToolDefinition = {
  name: 'macts__contacts__app_perform_action',
  description: 'RollOver - Performs the action on the given person and value',
  inputSchema: {
    type: 'object',
    properties: {
      with: {
        description: 'property that that was returned from the "action property" handler.',
        type: 'string',
      },
      for: {
        description: 'Currently selected person.',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['with', 'for'],
  },
  handler: async (args) => {
    const { with: _with, for: _for } = args as { with: string; for: string }
    const client = getClient()
    await client.performAction(
      _with as unknown as Parameters<typeof client.performAction>[0],
      _for as unknown as Parameters<typeof client.performAction>[1]
    )
    return { success: true }
  },
}

/**
 * RollOver - Determines if the rollover action should be enabled for the given person and value
 */
export const appShouldEnableActionTool: McpToolDefinition = {
  name: 'macts__contacts__app_should_enable_action',
  description:
    'RollOver - Determines if the rollover action should be enabled for the given person and value',
  inputSchema: {
    type: 'object',
    properties: {
      with: {
        description: 'property that that was returned from the "action property" handler.',
        type: 'string',
      },
      for: {
        description: 'Currently selected person.',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['with', 'for'],
  },
  handler: async (args) => {
    const { with: _with, for: _for } = args as { with: string; for: string }
    const client = getClient()
    await client.shouldEnableAction(
      _with as unknown as Parameters<typeof client.shouldEnableAction>[0],
      _for as unknown as Parameters<typeof client.shouldEnableAction>[1]
    )
    return { success: true }
  },
}
