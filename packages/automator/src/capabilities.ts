/**
 * Machine-readable capability metadata for Automator.
 *
 * Generated from the app manifest. Each entry describes one capability —
 * its stable name, app dependency, required permission (`app:resource:operation`),
 * and risk classification (read | write | delete | send | execute | system-change).
 *
 * @packageDocumentation
 */

/**
 * Risk classification for a capability.
 */
export type CapabilityRisk = 'read' | 'write' | 'delete' | 'send' | 'execute' | 'system-change'

/**
 * Machine-readable description of a single capability.
 */
export interface CapabilityMetadata {
  /** Stable dotted capability name (`<app>.<resource>.<operation>`). */
  readonly name: string
  /** App this capability belongs to. */
  readonly app: string
  /** Bundle identifier of the app dependency. */
  readonly appBundleId: string
  /** Resource the operation targets (`app` for app-scoped capabilities). */
  readonly resource: string
  /** Operation name. */
  readonly operation: string
  /** Human-readable description. */
  readonly description: string
  /** Required permission in `app:resource:operation` form, or null if none. */
  readonly permission: string | null
  /** Deterministic risk classification. */
  readonly risk: CapabilityRisk
  /** JSON Schema for the capability's input. */
  readonly inputSchema: Record<string, unknown>
}

/**
 * Every capability exposed by Automator, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'automator.app.add',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'app',
    operation: 'add',
    description: 'Add an Automator action or variable to a workflow',
    permission: 'automator:workflows:add',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        object: {
          description: 'The Automator action or variable to add',
          type: 'string',
        },
        to: {
          description: 'The workflow to which the action or variable is to be added',
          type: 'string',
        },
        atIndex: {
          description: 'The index at which the action or variable is to be added',
          type: 'number',
        },
      },
      additionalProperties: false,
      required: ['object', 'to'],
    },
  },
  {
    name: 'automator.app.remove',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'app',
    operation: 'remove',
    description: 'Remove an Automator action or variable from a workflow',
    permission: 'automator:workflows:remove',
    risk: 'delete',
    inputSchema: {
      type: 'object',
      properties: {
        object: {
          description: 'The Automator action or variable to remove',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['object'],
    },
  },
  {
    name: 'automator.automatoractions.get',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'automatoractions',
    operation: 'get',
    description: 'Get an action by ID',
    permission: 'automator:actions:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Action identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'automator.automatoractions.list',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'automatoractions',
    operation: 'list',
    description: 'List all actions in a workflow',
    permission: 'automator:actions:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        workflowName: {
          description: 'Workflow name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['workflowName'],
    },
  },
  {
    name: 'automator.requiredresources.get',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'requiredresources',
    operation: 'get',
    description: 'Get a required resource by name',
    permission: 'automator:requiredResources:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Resource name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'automator.requiredresources.list',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'requiredresources',
    operation: 'list',
    description: 'List all required resources for an action',
    permission: 'automator:requiredResources:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        actionId: {
          description: 'Action identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['actionId'],
    },
  },
  {
    name: 'automator.settings.get',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'settings',
    operation: 'get',
    description: 'Get a setting by name',
    permission: 'automator:settings:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Setting name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'automator.settings.list',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'settings',
    operation: 'list',
    description: 'List all settings for an action',
    permission: 'automator:settings:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        actionId: {
          description: 'Action identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['actionId'],
    },
  },
  {
    name: 'automator.variables.get',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'variables',
    operation: 'get',
    description: 'Get a variable by ID',
    permission: 'automator:variables:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Variable identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'automator.variables.list',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'variables',
    operation: 'list',
    description: 'List all variables in a workflow',
    permission: 'automator:variables:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        workflowName: {
          description: 'Workflow name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['workflowName'],
    },
  },
  {
    name: 'automator.workflows.execute',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'workflows',
    operation: 'execute',
    description: 'Execute a workflow',
    permission: 'automator:workflows:execute',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        workflow: {
          description: 'The workflow to execute',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['workflow'],
    },
  },
  {
    name: 'automator.workflows.get',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'workflows',
    operation: 'get',
    description: 'Get a workflow by name',
    permission: 'automator:workflows:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Workflow name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'automator.workflows.list',
    app: 'automator',
    appBundleId: 'com.apple.Automator',
    resource: 'workflows',
    operation: 'list',
    description: 'List all workflows',
    permission: 'automator:workflows:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
