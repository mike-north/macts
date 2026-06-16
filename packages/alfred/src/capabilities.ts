/**
 * Machine-readable capability metadata for Alfred.
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
 * Every capability exposed by Alfred, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'alfred.app.action',
    app: 'alfred',
    appBundleId: 'com.runningwithcrayons.Alfred',
    resource: 'app',
    operation: 'action',
    description: 'Show Alfred actions for the given file',
    permission: 'alfred:app:action',
    risk: 'execute',
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
  },
  {
    name: 'alfred.app.browse',
    app: 'alfred',
    appBundleId: 'com.runningwithcrayons.Alfred',
    resource: 'app',
    operation: 'browse',
    description: 'Show Alfred file system navigation for given path',
    permission: 'alfred:app:browse',
    risk: 'execute',
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
  },
  {
    name: 'alfred.app.reloadWorkflow',
    app: 'alfred',
    appBundleId: 'com.runningwithcrayons.Alfred',
    resource: 'app',
    operation: 'reloadWorkflow',
    description: 'Reload Workflow with given UID (folder name) or Bundle ID',
    permission: 'alfred:workflows:reload',
    risk: 'system-change',
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
  },
  {
    name: 'alfred.app.removeConfiguration',
    app: 'alfred',
    appBundleId: 'com.runningwithcrayons.Alfred',
    resource: 'app',
    operation: 'removeConfiguration',
    description: 'Revert workflow configuration value to default, or delete environment variable',
    permission: 'alfred:workflows:removeConfiguration',
    risk: 'delete',
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
  },
  {
    name: 'alfred.app.revealWorkflow',
    app: 'alfred',
    appBundleId: 'com.runningwithcrayons.Alfred',
    resource: 'app',
    operation: 'revealWorkflow',
    description: 'Reveal Workflow with given UID (folder name) or Bundle ID',
    permission: 'alfred:workflows:reveal',
    risk: 'execute',
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
  },
  {
    name: 'alfred.app.runTrigger',
    app: 'alfred',
    appBundleId: 'com.runningwithcrayons.Alfred',
    resource: 'app',
    operation: 'runTrigger',
    description: 'Run Alfred workflow trigger',
    permission: 'alfred:workflows:runTrigger',
    risk: 'execute',
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
  },
  {
    name: 'alfred.app.search',
    app: 'alfred',
    appBundleId: 'com.runningwithcrayons.Alfred',
    resource: 'app',
    operation: 'search',
    description: 'Show Alfred with the given text',
    permission: 'alfred:app:search',
    risk: 'read',
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
  },
  {
    name: 'alfred.app.setConfiguration',
    app: 'alfred',
    appBundleId: 'com.runningwithcrayons.Alfred',
    resource: 'app',
    operation: 'setConfiguration',
    description: 'Modify workflow configuration value, or set environment variable',
    permission: 'alfred:workflows:setConfiguration',
    risk: 'write',
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
  },
  {
    name: 'alfred.app.setTheme',
    app: 'alfred',
    appBundleId: 'com.runningwithcrayons.Alfred',
    resource: 'app',
    operation: 'setTheme',
    description: 'Change theme in Alfred',
    permission: 'alfred:app:setTheme',
    risk: 'write',
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
  },
]
