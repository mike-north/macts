/**
 * Machine-readable capability metadata for Xcode.
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
 * Every capability exposed by Xcode, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'xcode.projects.get',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'projects',
    operation: 'get',
    description: 'Get a project by ID',
    permission: 'xcode:projects:get',
    risk: 'read',
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
  },
  {
    name: 'xcode.projects.list',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'projects',
    operation: 'list',
    description: 'List all projects in a workspace',
    permission: 'xcode:projects:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceName: {
          description: 'Workspace document name',
          type: 'string',
        },
        pageSize: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'The most items to return, from 1 to 100 (default 25).',
        },
        cursor: {
          type: 'string',
          description:
            "The previous page's nextCursor, to read the page after it. Omit it to read the first page.",
        },
      },
      additionalProperties: false,
      required: ['workspaceName'],
    },
  },
  {
    name: 'xcode.runDestinations.get',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'runDestinations',
    operation: 'get',
    description: 'Get a run destination by name',
    permission: 'xcode:runDestinations:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Run destination name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'xcode.runDestinations.list',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'runDestinations',
    operation: 'list',
    description: 'List all run destinations in a workspace',
    permission: 'xcode:runDestinations:list',
    risk: 'read',
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
  },
  {
    name: 'xcode.schemes.get',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'schemes',
    operation: 'get',
    description: 'Get a scheme by ID',
    permission: 'xcode:schemes:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Scheme identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'xcode.schemes.list',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'schemes',
    operation: 'list',
    description: 'List all schemes in a workspace',
    permission: 'xcode:schemes:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceName: {
          description: 'Workspace document name',
          type: 'string',
        },
        pageSize: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'The most items to return, from 1 to 100 (default 25).',
        },
        cursor: {
          type: 'string',
          description:
            "The previous page's nextCursor, to read the page after it. Omit it to read the first page.",
        },
      },
      additionalProperties: false,
      required: ['workspaceName'],
    },
  },
  {
    name: 'xcode.workspaceDocuments.attach',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'workspaceDocuments',
    operation: 'attach',
    description: 'Start a new debugging session in the workspace',
    permission: 'xcode:workspace:attach',
    risk: 'execute',
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
  },
  {
    name: 'xcode.workspaceDocuments.build',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'workspaceDocuments',
    operation: 'build',
    description: 'Invoke the "build" scheme action',
    permission: 'xcode:workspace:build',
    risk: 'execute',
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
  },
  {
    name: 'xcode.workspaceDocuments.clean',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'workspaceDocuments',
    operation: 'clean',
    description: 'Invoke the "clean" scheme action',
    permission: 'xcode:workspace:clean',
    risk: 'execute',
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
  },
  {
    name: 'xcode.workspaceDocuments.debug',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'workspaceDocuments',
    operation: 'debug',
    description:
      'Start a debugging session using the "run" or "run without building" scheme action',
    permission: 'xcode:workspace:debug',
    risk: 'execute',
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
  },
  {
    name: 'xcode.workspaceDocuments.get',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'workspaceDocuments',
    operation: 'get',
    description: 'Get a workspace document by name',
    permission: 'xcode:workspaceDocuments:get',
    risk: 'read',
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
  },
  {
    name: 'xcode.workspaceDocuments.list',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'workspaceDocuments',
    operation: 'list',
    description: 'List all workspace documents',
    permission: 'xcode:workspaceDocuments:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'xcode.workspaceDocuments.run',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'workspaceDocuments',
    operation: 'run',
    description: 'Invoke the "run" scheme action',
    permission: 'xcode:workspace:run',
    risk: 'execute',
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
  },
  {
    name: 'xcode.workspaceDocuments.stop',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'workspaceDocuments',
    operation: 'stop',
    description: 'Stop the active scheme action, if one is running',
    permission: 'xcode:workspace:stop',
    risk: 'execute',
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
  },
  {
    name: 'xcode.workspaceDocuments.test',
    app: 'xcode',
    appBundleId: 'com.apple.dt.Xcode',
    resource: 'workspaceDocuments',
    operation: 'test',
    description: 'Invoke the "test" scheme action',
    permission: 'xcode:workspace:test',
    risk: 'execute',
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
  },
]
