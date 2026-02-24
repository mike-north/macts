/**
 * MCP tools for Xcode.app workspacedocuments operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * List all workspace documents
 */
export const workspacedocumentsListTool: McpToolDefinition = {
  name: 'macts__xcode__workspacedocuments_list',
  description: 'List all workspace documents',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    return client.workspacedocuments.list()
  },
}

/**
 * Get a workspace document by name
 */
export const workspacedocumentsGetTool: McpToolDefinition = {
  name: 'macts__xcode__workspacedocuments_get',
  description: 'Get a workspace document by name',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        description: 'Workspace document name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['name'],
  },
  handler: async (args) => {
    const { name } = args as { name: string }
    const client = getClient()
    return client.workspacedocuments.get(name)
  },
}

/**
 * Invoke the "build" scheme action
 */
export const workspacedocumentsBuildTool: McpToolDefinition = {
  name: 'macts__xcode__workspacedocuments_build',
  description: 'Invoke the "build" scheme action',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceName: {
        description: 'Workspace document name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['workspaceName'],
  },
  handler: async (args) => {
    const { workspaceName } = args as { workspaceName: string }
    const client = getClient()
    await client.workspacedocuments.build(workspaceName)
    return { success: true }
  },
}

/**
 * Invoke the "clean" scheme action
 */
export const workspacedocumentsCleanTool: McpToolDefinition = {
  name: 'macts__xcode__workspacedocuments_clean',
  description: 'Invoke the "clean" scheme action',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceName: {
        description: 'Workspace document name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['workspaceName'],
  },
  handler: async (args) => {
    const { workspaceName } = args as { workspaceName: string }
    const client = getClient()
    await client.workspacedocuments.clean(workspaceName)
    return { success: true }
  },
}

/**
 * Stop the active scheme action, if one is running
 */
export const workspacedocumentsStopTool: McpToolDefinition = {
  name: 'macts__xcode__workspacedocuments_stop',
  description: 'Stop the active scheme action, if one is running',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceName: {
        description: 'Workspace document name',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['workspaceName'],
  },
  handler: async (args) => {
    const { workspaceName } = args as { workspaceName: string }
    const client = getClient()
    await client.workspacedocuments.stop(workspaceName)
    return { success: true }
  },
}

/**
 * Invoke the "run" scheme action
 */
export const workspacedocumentsRunTool: McpToolDefinition = {
  name: 'macts__xcode__workspacedocuments_run',
  description: 'Invoke the "run" scheme action',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceName: {
        description: 'Workspace document name',
        type: 'string',
      },
      withCommandLineArguments: {
        description: 'Additional command line arguments to pass to the action',
        type: 'string',
      },
      withEnvironmentVariables: {
        description: 'Additional environment variables to set for the action',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['workspaceName'],
  },
  handler: async (args) => {
    const { workspaceName } = args as {
      workspaceName: string
      withCommandLineArguments?: string
      withEnvironmentVariables?: string
    }
    const client = getClient()
    await client.workspacedocuments.run(workspaceName)
    return { success: true }
  },
}

/**
 * Invoke the "test" scheme action
 */
export const workspacedocumentsTestTool: McpToolDefinition = {
  name: 'macts__xcode__workspacedocuments_test',
  description: 'Invoke the "test" scheme action',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceName: {
        description: 'Workspace document name',
        type: 'string',
      },
      withCommandLineArguments: {
        description: 'Additional command line arguments to pass to the action',
        type: 'string',
      },
      withEnvironmentVariables: {
        description: 'Additional environment variables to set for the action',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['workspaceName'],
  },
  handler: async (args) => {
    const { workspaceName } = args as {
      workspaceName: string
      withCommandLineArguments?: string
      withEnvironmentVariables?: string
    }
    const client = getClient()
    await client.workspacedocuments.test(workspaceName)
    return { success: true }
  },
}

/**
 * Start a new debugging session in the workspace
 */
export const workspacedocumentsAttachTool: McpToolDefinition = {
  name: 'macts__xcode__workspacedocuments_attach',
  description: 'Start a new debugging session in the workspace',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceName: {
        description: 'Workspace document name',
        type: 'string',
      },
      toProcessIdentifier: {
        description: 'The process identifier (pid) to which to attach',
        type: 'number',
      },
      suspended: {
        description: 'Whether to start debugging in a suspended state',
        type: 'boolean',
      },
    },
    additionalProperties: false,
    required: ['workspaceName', 'toProcessIdentifier', 'suspended'],
  },
  handler: async (args) => {
    const { workspaceName } = args as {
      workspaceName: string
      toProcessIdentifier: number
      suspended: boolean
    }
    const client = getClient()
    await client.workspacedocuments.attach(workspaceName)
    return { success: true }
  },
}

/**
 * Start a debugging session using the "run" or "run without building" scheme action
 */
export const workspacedocumentsDebugTool: McpToolDefinition = {
  name: 'macts__xcode__workspacedocuments_debug',
  description: 'Start a debugging session using the "run" or "run without building" scheme action',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceName: {
        description: 'Workspace document name',
        type: 'string',
      },
      scheme: {
        description: 'Scheme name',
        type: 'string',
      },
      runDestinationSpecifier: {
        description: 'Run destination specifier string',
        type: 'string',
      },
      skipBuilding: {
        description: 'Whether to perform "run without building" rather than "run"',
        type: 'boolean',
      },
      commandLineArguments: {
        description: 'Additional command line arguments to pass to the action',
        type: 'string',
      },
      environmentVariables: {
        description: 'Additional environment variables to set for the action',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['workspaceName'],
  },
  handler: async (args) => {
    const { workspaceName } = args as {
      workspaceName: string
      scheme?: string
      runDestinationSpecifier?: string
      skipBuilding?: boolean
      commandLineArguments?: string
      environmentVariables?: string
    }
    const client = getClient()
    await client.workspacedocuments.debug(workspaceName)
    return { success: true }
  },
}
