/**
 * MCP tools for Finder.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Open the specified object(s)
 */
export const appOpenTool: McpToolDefinition = {
  name: 'macts__finder__app_open',
  description: 'Open the specified object(s)',
  inputSchema: {
    type: 'object',
    properties: {
      using: {
        description: 'the application file to open the object with',
        type: 'string',
      },
      withProperties: {
        description:
          'the initial values for the properties, to be included with the open command sent to the application that opens the direct object',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { using, withProperties } = args as { using?: string; withProperties?: string }
    const client = getClient()
    await client.open(
      using as unknown as Parameters<typeof client.open>[0],
      withProperties as unknown as Parameters<typeof client.open>[1]
    )
    return { success: true }
  },
}

/**
 * Print the specified object(s)
 */
export const appPrintTool: McpToolDefinition = {
  name: 'macts__finder__app_print',
  description: 'Print the specified object(s)',
  inputSchema: {
    type: 'object',
    properties: {
      withProperties: {
        description:
          'optional properties to be included with the print command sent to the application that prints the direct object',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { withProperties } = args as { withProperties?: string }
    const client = getClient()
    await client.print(withProperties as unknown as Parameters<typeof client.print>[0])
    return { success: true }
  },
}

/**
 * Quit the Finder
 */
export const appQuitTool: McpToolDefinition = {
  name: 'macts__finder__app_quit',
  description: 'Quit the Finder',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.quit()
    return { success: true }
  },
}

/**
 * Activate the specified window (or the Finder)
 */
export const appActivateTool: McpToolDefinition = {
  name: 'macts__finder__app_activate',
  description: 'Activate the specified window (or the Finder)',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.activate()
    return { success: true }
  },
}

/**
 * Close an object
 */
export const appCloseTool: McpToolDefinition = {
  name: 'macts__finder__app_close',
  description: 'Close an object',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.close()
    return { success: true }
  },
}

/**
 * Return the number of elements of a particular class within an object
 */
export const appCountTool: McpToolDefinition = {
  name: 'macts__finder__app_count',
  description: 'Return the number of elements of a particular class within an object',
  inputSchema: {
    type: 'object',
    properties: {
      each: {
        description: 'the class of the elements to be counted',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['each'],
  },
  handler: async (args) => {
    const { each } = args as { each: string }
    const client = getClient()
    await client.count(each as unknown as Parameters<typeof client.count>[0])
    return { success: true }
  },
}

/**
 * Return the size in bytes of an object
 */
export const appDataSizeTool: McpToolDefinition = {
  name: 'macts__finder__app_data_size',
  description: 'Return the size in bytes of an object',
  inputSchema: {
    type: 'object',
    properties: {
      as: {
        description: 'the data type for which the size is calculated',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { as } = args as { as?: string }
    const client = getClient()
    await client.dataSize(as as unknown as Parameters<typeof client.dataSize>[0])
    return { success: true }
  },
}

/**
 * Move an item from its container to the trash
 */
export const appDeleteTool: McpToolDefinition = {
  name: 'macts__finder__app_delete',
  description: 'Move an item from its container to the trash',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client._delete()
    return { success: true }
  },
}

/**
 * Duplicate one or more object(s)
 */
export const appDuplicateTool: McpToolDefinition = {
  name: 'macts__finder__app_duplicate',
  description: 'Duplicate one or more object(s)',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        description: 'the new location for the object(s)',
        type: 'string',
      },
      replacing: {
        description:
          'Specifies whether or not to replace items in the destination that have the same name as items being duplicated',
        type: 'boolean',
      },
      routingSuppressed: {
        description:
          'Specifies whether or not to autoroute items (default is false). Only applies when copying to the system folder.',
        type: 'boolean',
      },
      exactCopy: {
        description: 'Specifies whether or not to copy permissions/ownership as is',
        type: 'boolean',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { to, replacing, routingSuppressed, exactCopy } = args as {
      to?: string
      replacing?: boolean
      routingSuppressed?: boolean
      exactCopy?: boolean
    }
    const client = getClient()
    await client.duplicate(
      to as unknown as Parameters<typeof client.duplicate>[0],
      replacing as unknown as Parameters<typeof client.duplicate>[1],
      routingSuppressed as unknown as Parameters<typeof client.duplicate>[2],
      exactCopy as unknown as Parameters<typeof client.duplicate>[3]
    )
    return { success: true }
  },
}

/**
 * Verify if an object exists
 */
export const appExistsTool: McpToolDefinition = {
  name: 'macts__finder__app_exists',
  description: 'Verify if an object exists',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.exists()
    return { success: true }
  },
}

/**
 * Make a new element
 */
export const appMakeTool: McpToolDefinition = {
  name: 'macts__finder__app_make',
  description: 'Make a new element',
  inputSchema: {
    type: 'object',
    properties: {
      new: {
        description: 'the class of the new element',
        type: 'string',
      },
      at: {
        description: 'the location at which to insert the element',
        type: 'string',
      },
      to: {
        description:
          'when creating an alias file, the original item to create an alias to or when creating a file viewer window, the target of the window',
        type: 'string',
      },
      withProperties: {
        description: 'the initial values for the properties of the element',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['new', 'at'],
  },
  handler: async (args) => {
    const {
      new: _new,
      at,
      to,
      withProperties,
    } = args as { new: string; at: string; to?: string; withProperties?: string }
    const client = getClient()
    await client.make(
      _new as unknown as Parameters<typeof client.make>[0],
      at as unknown as Parameters<typeof client.make>[1],
      to as unknown as Parameters<typeof client.make>[2],
      withProperties as unknown as Parameters<typeof client.make>[3]
    )
    return { success: true }
  },
}

/**
 * Move object(s) to a new location
 */
export const appMoveTool: McpToolDefinition = {
  name: 'macts__finder__app_move',
  description: 'Move object(s) to a new location',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        description: 'the new location for the object(s)',
        type: 'string',
      },
      replacing: {
        description:
          'Specifies whether or not to replace items in the destination that have the same name as items being moved',
        type: 'boolean',
      },
      positionedAt: {
        description:
          'Gives a list (in local window coordinates) of positions for the destination items',
        type: 'string',
      },
      routingSuppressed: {
        description:
          'Specifies whether or not to autoroute items (default is false). Only applies when moving to the system folder.',
        type: 'boolean',
      },
    },
    additionalProperties: false,
    required: ['to'],
  },
  handler: async (args) => {
    const { to, replacing, positionedAt, routingSuppressed } = args as {
      to: string
      replacing?: boolean
      positionedAt?: string
      routingSuppressed?: boolean
    }
    const client = getClient()
    await client.move(
      to as unknown as Parameters<typeof client.move>[0],
      replacing as unknown as Parameters<typeof client.move>[1],
      positionedAt as unknown as Parameters<typeof client.move>[2],
      routingSuppressed as unknown as Parameters<typeof client.move>[3]
    )
    return { success: true }
  },
}

/**
 * Select the specified object(s)
 */
export const appSelectTool: McpToolDefinition = {
  name: 'macts__finder__app_select',
  description: 'Select the specified object(s)',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.select()
    return { success: true }
  },
}

/**
 * Private event to open a virtual location
 */
export const appOpenVirtualLocationTool: McpToolDefinition = {
  name: 'macts__finder__app_open_virtual_location',
  description: 'Private event to open a virtual location',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.openVirtualLocation()
    return { success: true }
  },
}

/**
 * (NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front application)
 */
export const appCopyTool: McpToolDefinition = {
  name: 'macts__finder__app_copy',
  description:
    '(NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front application)',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.copy()
    return { success: true }
  },
}

/**
 * Return the specified object(s) in a sorted list
 */
export const appSortTool: McpToolDefinition = {
  name: 'macts__finder__app_sort',
  description: 'Return the specified object(s) in a sorted list',
  inputSchema: {
    type: 'object',
    properties: {
      by: {
        description: 'the property to sort the items by (name, index, date, etc.)',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['by'],
  },
  handler: async (args) => {
    const { by } = args as { by: string }
    const client = getClient()
    await client.sort(by as unknown as Parameters<typeof client.sort>[0])
    return { success: true }
  },
}

/**
 * Arrange items in window nicely (only applies to open windows in icon view that are not kept arranged)
 */
export const appCleanUpTool: McpToolDefinition = {
  name: 'macts__finder__app_clean_up',
  description:
    'Arrange items in window nicely (only applies to open windows in icon view that are not kept arranged)',
  inputSchema: {
    type: 'object',
    properties: {
      by: {
        description: 'the order in which to clean up the objects (name, index, date, etc.)',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { by } = args as { by?: string }
    const client = getClient()
    await client.cleanUp(by as unknown as Parameters<typeof client.cleanUp>[0])
    return { success: true }
  },
}

/**
 * Eject the specified disk(s)
 */
export const appEjectTool: McpToolDefinition = {
  name: 'macts__finder__app_eject',
  description: 'Eject the specified disk(s)',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.eject()
    return { success: true }
  },
}

/**
 * Empty the trash
 */
export const appEmptyTool: McpToolDefinition = {
  name: 'macts__finder__app_empty',
  description: 'Empty the trash',
  inputSchema: {
    type: 'object',
    properties: {
      security: {
        description: '(obsolete)',
        type: 'boolean',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { security } = args as { security?: boolean }
    const client = getClient()
    await client.empty(security as unknown as Parameters<typeof client.empty>[0])
    return { success: true }
  },
}

/**
 * (NOT AVAILABLE) Erase the specified disk(s)
 */
export const appEraseTool: McpToolDefinition = {
  name: 'macts__finder__app_erase',
  description: '(NOT AVAILABLE) Erase the specified disk(s)',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.erase()
    return { success: true }
  },
}

/**
 * Bring the specified object(s) into view
 */
export const appRevealTool: McpToolDefinition = {
  name: 'macts__finder__app_reveal',
  description: 'Bring the specified object(s) into view',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.reveal()
    return { success: true }
  },
}

/**
 * Update the display of the specified object(s) to match their on-disk representation
 */
export const appUpdateTool: McpToolDefinition = {
  name: 'macts__finder__app_update',
  description:
    'Update the display of the specified object(s) to match their on-disk representation',
  inputSchema: {
    type: 'object',
    properties: {
      necessity: {
        description: 'only update if necessary (i.e. a finder window is open). default is false',
        type: 'boolean',
      },
      registeringApplications: {
        description: 'register applications. default is true',
        type: 'boolean',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { necessity, registeringApplications } = args as {
      necessity?: boolean
      registeringApplications?: boolean
    }
    const client = getClient()
    await client.update(
      necessity as unknown as Parameters<typeof client.update>[0],
      registeringApplications as unknown as Parameters<typeof client.update>[1]
    )
    return { success: true }
  },
}

/**
 * Restart the computer
 */
export const appRestartTool: McpToolDefinition = {
  name: 'macts__finder__app_restart',
  description: 'Restart the computer',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.restart()
    return { success: true }
  },
}

/**
 * Shut Down the computer
 */
export const appShutDownTool: McpToolDefinition = {
  name: 'macts__finder__app_shut_down',
  description: 'Shut Down the computer',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.shutDown()
    return { success: true }
  },
}

/**
 * Put the computer to sleep
 */
export const appSleepTool: McpToolDefinition = {
  name: 'macts__finder__app_sleep',
  description: 'Put the computer to sleep',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.sleep()
    return { success: true }
  },
}
