/**
 * Machine-readable capability metadata for OmniFocus.
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
 * Every capability exposed by OmniFocus, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'omnifocus.app.archive',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'app',
    operation: 'archive',
    description: 'Write a backup archive of the document',
    permission: 'omnifocus:app:archive',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        in: {
          description: 'The file in which to archive the document',
          type: 'string',
        },
        compression: {
          description: 'Should the archive be written with data compression enabled',
          type: 'boolean',
        },
      },
      additionalProperties: false,
      required: ['in'],
    },
  },
  {
    name: 'omnifocus.app.compact',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'app',
    operation: 'compact',
    description: 'Hides completed tasks and processes any inbox items',
    permission: 'omnifocus:app:compact',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnifocus.app.complete',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'app',
    operation: 'complete',
    description: 'Generate a list of completions given a string',
    permission: 'omnifocus:app:complete',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          description: 'Text to complete',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['text'],
    },
  },
  {
    name: 'omnifocus.app.importInto',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'app',
    operation: 'importInto',
    description: 'Imports a file into an existing OmniFocus document',
    permission: 'omnifocus:app:importInto',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          description: 'File to import',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['file'],
    },
  },
  {
    name: 'omnifocus.app.markComplete',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'app',
    operation: 'markComplete',
    description: 'Mark one or more projects or tasks complete',
    permission: 'omnifocus:app:markComplete',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        targets: {
          description: 'Objects to mark complete',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['targets'],
    },
  },
  {
    name: 'omnifocus.app.markDropped',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'app',
    operation: 'markDropped',
    description: 'Mark one or more projects or tasks as dropped',
    permission: 'omnifocus:app:markDropped',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        targets: {
          description: 'Objects to mark dropped',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['targets'],
    },
  },
  {
    name: 'omnifocus.app.markIncomplete',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'app',
    operation: 'markIncomplete',
    description: 'Mark one or more projects or tasks incomplete',
    permission: 'omnifocus:app:markIncomplete',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        targets: {
          description: 'Objects to mark incomplete',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['targets'],
    },
  },
  {
    name: 'omnifocus.app.parseTasksInto',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'app',
    operation: 'parseTasksInto',
    description: 'Converts a textual representation of tasks into tasks',
    permission: 'omnifocus:app:parseTasksInto',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          description: 'Text to parse',
          type: 'string',
        },
        into: {
          description: 'Target container',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['text', 'into'],
    },
  },
  {
    name: 'omnifocus.app.redo',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'app',
    operation: 'redo',
    description: 'Redo the last undone command',
    permission: 'omnifocus:app:redo',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnifocus.app.synchronize',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'app',
    operation: 'synchronize',
    description: 'Synchronizes with the shared OmniFocus sync database',
    permission: 'omnifocus:app:synchronize',
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnifocus.app.undo',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'app',
    operation: 'undo',
    description: 'Undo the last command',
    permission: 'omnifocus:app:undo',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnifocus.folders.create',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'folders',
    operation: 'create',
    description: 'Create a new folder',
    permission: 'omnifocus:folders:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Folder name',
          type: 'string',
        },
        note: {
          description: 'Folder note',
          type: 'string',
        },
        hidden: {
          description: 'Set if the folder is currently hidden',
          type: 'boolean',
        },
      },
      additionalProperties: false,
      required: ['name', 'hidden'],
    },
  },
  {
    name: 'omnifocus.folders.get',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'folders',
    operation: 'get',
    description: 'Get a folder by ID',
    permission: 'omnifocus:folders:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Folder identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omnifocus.folders.list',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'folders',
    operation: 'list',
    description: 'List all folders',
    permission: 'omnifocus:folders:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnifocus.inboxtasks.create',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'inboxtasks',
    operation: 'create',
    description: 'Create a new inbox task',
    permission: 'omnifocus:inboxTasks:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Task name',
          type: 'string',
        },
        note: {
          description: 'Task note',
          type: 'string',
        },
        flagged: {
          description: 'True if flagged',
          type: 'boolean',
        },
        deferDate: {
          description: 'When the task should become available for action',
          type: 'string',
        },
        dueDate: {
          description: 'When the task must be finished',
          type: 'string',
        },
        creationDate: {
          description: 'When the task was created',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name', 'flagged', 'deferDate', 'dueDate', 'creationDate'],
    },
  },
  {
    name: 'omnifocus.inboxtasks.get',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'inboxtasks',
    operation: 'get',
    description: 'Get an inbox task by ID',
    permission: 'omnifocus:inboxTasks:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Inbox task identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omnifocus.inboxtasks.list',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'inboxtasks',
    operation: 'list',
    description: 'List all inbox tasks',
    permission: 'omnifocus:inboxTasks:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnifocus.perspectives.get',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'perspectives',
    operation: 'get',
    description: 'Get a perspective by ID',
    permission: 'omnifocus:perspectives:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Perspective identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omnifocus.perspectives.list',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'perspectives',
    operation: 'list',
    description: 'List all perspectives',
    permission: 'omnifocus:perspectives:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnifocus.projects.create',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'projects',
    operation: 'create',
    description: 'Create a new project',
    permission: 'omnifocus:projects:create',
    risk: 'write',
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
          description:
            'The estimated time, in whole minutes, that this project will take to finish',
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
  },
  {
    name: 'omnifocus.projects.get',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'projects',
    operation: 'get',
    description: 'Get a project by ID',
    permission: 'omnifocus:projects:get',
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
    name: 'omnifocus.projects.list',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'projects',
    operation: 'list',
    description: 'List all projects',
    permission: 'omnifocus:projects:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnifocus.tags.create',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'tags',
    operation: 'create',
    description: 'Create a new tag',
    permission: 'omnifocus:tags:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Tag name',
          type: 'string',
        },
        note: {
          description: 'The note of the tag',
          type: 'string',
        },
        allowsNextAction: {
          description:
            'If false, tasks associated with this tag will be skipped when determining the next action for a project',
          type: 'boolean',
        },
        hidden: {
          description: 'Set if the tag is currently hidden',
          type: 'boolean',
        },
      },
      additionalProperties: false,
      required: ['name', 'note', 'allowsNextAction', 'hidden'],
    },
  },
  {
    name: 'omnifocus.tags.get',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'tags',
    operation: 'get',
    description: 'Get a tag by ID',
    permission: 'omnifocus:tags:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Tag identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omnifocus.tags.list',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'tags',
    operation: 'list',
    description: 'List all tags',
    permission: 'omnifocus:tags:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnifocus.tasks.create',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'tasks',
    operation: 'create',
    description: 'Create a new task',
    permission: 'omnifocus:tasks:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Task name',
          type: 'string',
        },
        note: {
          description: 'Task note',
          type: 'string',
        },
        deferDate: {
          description: 'Defer date',
          type: 'string',
        },
        dueDate: {
          description: 'Due date',
          type: 'string',
        },
        flagged: {
          description: 'True if flagged',
          type: 'boolean',
        },
        plannedDate: {
          description: 'The date at which work for this task is intended',
          type: 'string',
        },
        completionDate: {
          description: "The task's date of completion",
          type: 'string',
        },
        droppedDate: {
          description: 'The date the task was dropped',
          type: 'string',
        },
        creationDate: {
          description: 'When the task was created',
          type: 'string',
        },
        estimatedMinutes: {
          description: 'The estimated time, in whole minutes, that this task will take to finish',
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
      },
      additionalProperties: false,
      required: [
        'name',
        'flagged',
        'plannedDate',
        'completionDate',
        'droppedDate',
        'creationDate',
        'estimatedMinutes',
        'sequential',
        'completedByChildren',
      ],
    },
  },
  {
    name: 'omnifocus.tasks.get',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'tasks',
    operation: 'get',
    description: 'Get a task by ID',
    permission: 'omnifocus:tasks:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Task identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omnifocus.tasks.list',
    app: 'omnifocus',
    appBundleId: 'com.omnigroup.OmniFocus4',
    resource: 'tasks',
    operation: 'list',
    description: 'List all tasks',
    permission: 'omnifocus:tasks:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
