/**
 * MCP tools for Alfred.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/types'
import { getClient } from '../sdk.js'

/**
 * Show Alfred with the given text
 */
export const appSearchTool: McpToolDefinition = {
  name: 'macts__alfred__app_search',
  description: 'Show Alfred with the given text',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        description: 'The search string to populate Alfred with',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { query } = args as { query?: string }
    const client = getClient()
    await client.search(query as unknown as Parameters<typeof client.search>[0])
    return { success: true }
  },
}

/**
 * Show Alfred actions for the given file
 */
export const appActionTool: McpToolDefinition = {
  name: 'macts__alfred__app_action',
  description: 'Show Alfred actions for the given file',
  inputSchema: {
    type: 'object',
    properties: {
      items: {
        description: 'The items to show actions for',
        type: 'array',
        items: {
          type: 'string',
        },
      },
      asType: {
        description: 'An optional type for the items - file, url or text',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['items'],
  },
  handler: async (args) => {
    const { items, asType } = args as { items: string[]; asType?: string }
    const client = getClient()
    await client.action(
      items as unknown as Parameters<typeof client.action>[0],
      asType as unknown as Parameters<typeof client.action>[1]
    )
    return { success: true }
  },
}

/**
 * Show Alfred file system navigation for given path
 */
export const appBrowseTool: McpToolDefinition = {
  name: 'macts__alfred__app_browse',
  description: 'Show Alfred file system navigation for given path',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        description: 'The path or search string to browse',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['path'],
  },
  handler: async (args) => {
    const { path } = args as { path: string }
    const client = getClient()
    await client.browse(path as unknown as Parameters<typeof client.browse>[0])
    return { success: true }
  },
}

/**
 * Run Alfred workflow trigger
 */
export const appRunTriggerTool: McpToolDefinition = {
  name: 'macts__alfred__app_run_trigger',
  description: 'Run Alfred workflow trigger',
  inputSchema: {
    type: 'object',
    properties: {
      trigger: {
        description: 'The identifier of the trigger',
        type: 'string',
      },
      inWorkflow: {
        description: 'The workflow bundle identifier',
        type: 'string',
      },
      withArgument: {
        description: 'An optional argument',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['trigger', 'inWorkflow'],
  },
  handler: async (args) => {
    const { trigger, inWorkflow, withArgument } = args as {
      trigger: string
      inWorkflow: string
      withArgument?: string
    }
    const client = getClient()
    await client.runTrigger(
      trigger as unknown as Parameters<typeof client.runTrigger>[0],
      inWorkflow as unknown as Parameters<typeof client.runTrigger>[1],
      withArgument as unknown as Parameters<typeof client.runTrigger>[2]
    )
    return { success: true }
  },
}

/**
 * Reload Workflow with given UID (folder name) or Bundle ID
 */
export const appReloadWorkflowTool: McpToolDefinition = {
  name: 'macts__alfred__app_reload_workflow',
  description: 'Reload Workflow with given UID (folder name) or Bundle ID',
  inputSchema: {
    type: 'object',
    properties: {
      workflow: {
        description: 'The UID (folder name), or the Bundle ID of the workflow to reload',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['workflow'],
  },
  handler: async (args) => {
    const { workflow } = args as { workflow: string }
    const client = getClient()
    await client.reloadWorkflow(workflow as unknown as Parameters<typeof client.reloadWorkflow>[0])
    return { success: true }
  },
}

/**
 * Reveal Workflow with given UID (folder name) or Bundle ID
 */
export const appRevealWorkflowTool: McpToolDefinition = {
  name: 'macts__alfred__app_reveal_workflow',
  description: 'Reveal Workflow with given UID (folder name) or Bundle ID',
  inputSchema: {
    type: 'object',
    properties: {
      workflow: {
        description: 'The UID (folder name), or the Bundle ID of the workflow to reveal',
        type: 'string',
      },
      configuration: {
        description: 'Optionally open the configuration for this workflow',
        type: 'boolean',
      },
      details: {
        description: 'Optionally open the details for this workflow',
        type: 'boolean',
      },
    },
    additionalProperties: false,
    required: ['workflow'],
  },
  handler: async (args) => {
    const { workflow, configuration, details } = args as {
      workflow: string
      configuration?: boolean
      details?: boolean
    }
    const client = getClient()
    await client.revealWorkflow(
      workflow as unknown as Parameters<typeof client.revealWorkflow>[0],
      configuration as unknown as Parameters<typeof client.revealWorkflow>[1],
      details as unknown as Parameters<typeof client.revealWorkflow>[2]
    )
    return { success: true }
  },
}

/**
 * Modify workflow configuration value, or set environment variable
 */
export const appSetConfigurationTool: McpToolDefinition = {
  name: 'macts__alfred__app_set_configuration',
  description: 'Modify workflow configuration value, or set environment variable',
  inputSchema: {
    type: 'object',
    properties: {
      variable: {
        description: 'The name of the variable',
        type: 'string',
      },
      toValue: {
        description: 'The value to set',
        type: 'string',
      },
      inWorkflow: {
        description: 'The workflow bundle identifier',
        type: 'string',
      },
      exportable: {
        description:
          "If this environment variable is fine for export, i.e. the Don't Export box is left unchecked (Defaults to Don't Export). This option is ignored for workflow configuration items",
        type: 'boolean',
      },
    },
    additionalProperties: false,
    required: ['variable', 'toValue', 'inWorkflow'],
  },
  handler: async (args) => {
    const { variable, toValue, inWorkflow, exportable } = args as {
      variable: string
      toValue: string
      inWorkflow: string
      exportable?: boolean
    }
    const client = getClient()
    await client.setConfiguration(
      variable as unknown as Parameters<typeof client.setConfiguration>[0],
      toValue as unknown as Parameters<typeof client.setConfiguration>[1],
      inWorkflow as unknown as Parameters<typeof client.setConfiguration>[2],
      exportable as unknown as Parameters<typeof client.setConfiguration>[3]
    )
    return { success: true }
  },
}

/**
 * Revert workflow configuration value to default, or delete environment variable
 */
export const appRemoveConfigurationTool: McpToolDefinition = {
  name: 'macts__alfred__app_remove_configuration',
  description: 'Revert workflow configuration value to default, or delete environment variable',
  inputSchema: {
    type: 'object',
    properties: {
      variable: {
        description: 'The name of the variable',
        type: 'string',
      },
      inWorkflow: {
        description: 'The workflow bundle identifier',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['variable', 'inWorkflow'],
  },
  handler: async (args) => {
    const { variable, inWorkflow } = args as { variable: string; inWorkflow: string }
    const client = getClient()
    await client.removeConfiguration(
      variable as unknown as Parameters<typeof client.removeConfiguration>[0],
      inWorkflow as unknown as Parameters<typeof client.removeConfiguration>[1]
    )
    return { success: true }
  },
}

/**
 * Change theme in Alfred
 */
export const appSetThemeTool: McpToolDefinition = {
  name: 'macts__alfred__app_set_theme',
  description: 'Change theme in Alfred',
  inputSchema: {
    type: 'object',
    properties: {
      theme: {
        description: 'The name of the theme to switch to',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['theme'],
  },
  handler: async (args) => {
    const { theme } = args as { theme: string }
    const client = getClient()
    await client.setTheme(theme as unknown as Parameters<typeof client.setTheme>[0])
    return { success: true }
  },
}
