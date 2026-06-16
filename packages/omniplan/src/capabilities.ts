/**
 * Machine-readable capability metadata for OmniPlan.
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
 * Every capability exposed by OmniPlan, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'omniplan.app.addWorkTime',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'app',
    operation: 'addWorkTime',
    description: 'Add working hours to a schedule',
    permission: 'omniplan:app:addWorkTime',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        schedule: {
          description: 'Target schedule',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['schedule'],
    },
  },
  {
    name: 'omniplan.app.assign',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'app',
    operation: 'assign',
    description: 'Assign resources to tasks',
    permission: 'omniplan:app:assign',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        resource: {
          description: 'Resource to assign',
          type: 'string',
        },
        task: {
          description: 'Task to assign to',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['resource', 'task'],
    },
  },
  {
    name: 'omniplan.app.baseline',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'app',
    operation: 'baseline',
    description: 'Commit the current schedule as the baseline schedule',
    permission: 'omniplan:app:baseline',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.app.changeMark',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'app',
    operation: 'changeMark',
    description: 'Make a change tracking mark on project',
    permission: 'omniplan:app:changeMark',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.app.depend',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'app',
    operation: 'depend',
    description: 'Create a dependency between tasks',
    permission: 'omniplan:app:depend',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        prerequisite: {
          description: 'Prerequisite task',
          type: 'string',
        },
        dependent: {
          description: 'Dependent task',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['prerequisite', 'dependent'],
    },
  },
  {
    name: 'omniplan.app.export',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'app',
    operation: 'export',
    description: 'Export a document',
    permission: 'omniplan:app:export',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'Export file path',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['to'],
    },
  },
  {
    name: 'omniplan.app.level',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'app',
    operation: 'level',
    description: 'Level resources on project',
    permission: 'omniplan:app:level',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.app.lookup',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'app',
    operation: 'lookup',
    description: 'Look up a task via a custom data key',
    permission: 'omniplan:app:lookup',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          description: 'Custom data key',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['key'],
    },
  },
  {
    name: 'omniplan.app.redo',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'app',
    operation: 'redo',
    description: 'Redo the last undone command',
    permission: 'omniplan:app:redo',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.app.subtractWorkTime',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'app',
    operation: 'subtractWorkTime',
    description: 'Remove working hours from a schedule',
    permission: 'omniplan:app:subtractWorkTime',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        schedule: {
          description: 'Target schedule',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['schedule'],
    },
  },
  {
    name: 'omniplan.app.undo',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'app',
    operation: 'undo',
    description: 'Undo the last command',
    permission: 'omniplan:app:undo',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.assignments.list',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'assignments',
    operation: 'list',
    description: 'List all assignments',
    permission: 'omniplan:assignments:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.dependencies.list',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'dependencies',
    operation: 'list',
    description: 'List all dependencies',
    permission: 'omniplan:dependencies:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.milestones.create',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'milestones',
    operation: 'create',
    description: 'Create a new milestone',
    permission: 'omniplan:milestones:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Milestone name',
          type: 'string',
        },
        startingDate: {
          description: 'Milestone date',
          type: 'string',
        },
        note: {
          description: 'Notes',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name', 'note'],
    },
  },
  {
    name: 'omniplan.milestones.get',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'milestones',
    operation: 'get',
    description: 'Get a milestone by ID',
    permission: 'omniplan:milestones:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Milestone identifier',
          type: 'number',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omniplan.milestones.list',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'milestones',
    operation: 'list',
    description: 'List all milestones',
    permission: 'omniplan:milestones:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.projects.get',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'projects',
    operation: 'get',
    description: 'Get a project',
    permission: 'omniplan:projects:get',
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
    name: 'omniplan.projects.list',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'projects',
    operation: 'list',
    description: 'List all projects',
    permission: 'omniplan:projects:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.resources.create',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'resources',
    operation: 'create',
    description: 'Create a new resource',
    permission: 'omniplan:resources:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Resource name',
          type: 'string',
        },
        resourceType: {
          description: 'Resource type',
          type: 'string',
        },
        number: {
          description: 'The total number of units for this resource (1.0 = 100%)',
          type: 'number',
        },
        emailAddress: {
          description: 'Email address for this resource',
          type: 'string',
        },
        costPerUse: {
          description: 'The fixed cost per use of this resource',
          type: 'number',
        },
        costPerHour: {
          description: 'The cost per hour of this resource',
          type: 'number',
        },
        efficiency: {
          description: 'Resource efficiency (1.0 = 100%)',
          type: 'number',
        },
        note: {
          description: 'Notes',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: [
        'name',
        'number',
        'emailAddress',
        'costPerUse',
        'costPerHour',
        'efficiency',
        'note',
      ],
    },
  },
  {
    name: 'omniplan.resources.get',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'resources',
    operation: 'get',
    description: 'Get a resource by ID',
    permission: 'omniplan:resources:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Resource identifier',
          type: 'number',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omniplan.resources.list',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'resources',
    operation: 'list',
    description: 'List all resources',
    permission: 'omniplan:resources:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.scenarios.get',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'scenarios',
    operation: 'get',
    description: 'Get a scenario by ID',
    permission: 'omniplan:scenarios:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Scenario identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omniplan.scenarios.list',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'scenarios',
    operation: 'list',
    description: 'List all scenarios',
    permission: 'omniplan:scenarios:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.tasks.create',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'tasks',
    operation: 'create',
    description: 'Create a new task',
    permission: 'omniplan:tasks:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Task name',
          type: 'string',
        },
        startingDate: {
          description: 'Start date',
          type: 'string',
        },
        duration: {
          description: 'Duration in seconds',
          type: 'number',
        },
        endingDate: {
          description: 'The date on which work ends',
          type: 'string',
        },
        effort: {
          description: 'The number of person-seconds required to perform the task',
          type: 'number',
        },
        completed: {
          description: 'The percentage of the task which is complete (1.0 = 100%)',
          type: 'number',
        },
        completedEffort: {
          description: 'The person-seconds completed',
          type: 'number',
        },
        priority: {
          description: 'Priority of this task',
          type: 'number',
        },
        taskType: {
          description: 'Whether this task is a standard task, milestone, group, or hammock',
          type: 'string',
        },
        staticCost: {
          description: 'Cost for this task itself',
          type: 'number',
        },
        startingConstraintDate: {
          description: 'The earliest date this task may start',
          type: 'string',
        },
        endingConstraintDate: {
          description: 'The latest date this task may end',
          type: 'string',
        },
        startingDateLocked: {
          description: 'Whether the start date is locked or not',
          type: 'boolean',
        },
        endingDateLocked: {
          description: 'Whether the end date is locked or not',
          type: 'boolean',
        },
        note: {
          description: 'Notes',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: [
        'name',
        'endingDate',
        'effort',
        'completed',
        'completedEffort',
        'priority',
        'taskType',
        'staticCost',
        'startingConstraintDate',
        'endingConstraintDate',
        'startingDateLocked',
        'endingDateLocked',
        'note',
      ],
    },
  },
  {
    name: 'omniplan.tasks.get',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'tasks',
    operation: 'get',
    description: 'Get a task by ID',
    permission: 'omniplan:tasks:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Task identifier',
          type: 'number',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omniplan.tasks.list',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'tasks',
    operation: 'list',
    description: 'List all tasks',
    permission: 'omniplan:tasks:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.violations.fix',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'violations',
    operation: 'fix',
    description: 'Fix a violation',
    permission: 'omniplan:violations:fix',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omniplan.violations.list',
    app: 'omniplan',
    appBundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
    resource: 'violations',
    operation: 'list',
    description: 'List all violations',
    permission: 'omniplan:violations:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
