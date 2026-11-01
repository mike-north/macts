/**
 * MCP tools for System-events.app uiElements operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * cause the target process to behave as if the UI element were clicked
 */
export const uiElementsClickTool: McpToolDefinition = {
  name: 'macts__system-events__uiElements_click',
  description: 'cause the target process to behave as if the UI element were clicked',
  inputSchema: {
    type: 'object',
    properties: {
      at: {
        description:
          'when sent to a "process" object, the { x, y } location at which to click, in global coordinates',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { at } = args as { at?: string }
    const client = getClient()
    await client.uiElements.click(at as unknown as Parameters<typeof client.uiElements.click>[0])
    return { success: true }
  },
}

/**
 * set the selected property of the UI element
 */
export const uiElementsSelectTool: McpToolDefinition = {
  name: 'macts__system-events__uiElements_select',
  description: 'set the selected property of the UI element',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.uiElements.select()
    return { success: true }
  },
}
