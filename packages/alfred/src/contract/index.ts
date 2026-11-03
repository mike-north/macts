/**
 * The Alfred contract: the transport-neutral description of every
 * Alfred operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `AlfredClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `AlfredClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Alfred manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type OperationDescriptor,
} from '@macts/contracts'

const t = ValueTypes

/** The Alfred application */
export interface Application {
  /**
   * The name of the application.
   * Never null: the primary identifier.
   */
  readonly name: string
}

/** Input for creating an Application. */
export type ApplicationCreateInput = Record<string, never>

/** Input for updating an Application. Omitted fields are left unchanged. */
export type ApplicationUpdateInput = Record<string, never>

/**
 * The Alfred client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link alfredContract}.
 */
export interface AlfredClient {
  /**
   * Show Alfred with the given text
   *
   * @param query - The search string to populate Alfred with. Does not accept null.
   */
  search(query?: string, options?: CallOptions): Promise<void>
  /**
   * Show Alfred actions for the given file
   *
   * @param items - The items to show actions for. Does not accept null.
   * @param asType - An optional type for the items - file, url or text. Does not accept null.
   */
  action(items: readonly string[], asType?: string, options?: CallOptions): Promise<void>
  /**
   * Show Alfred file system navigation for given path
   *
   * @param path - The path or search string to browse. Does not accept null.
   */
  browse(path: string, options?: CallOptions): Promise<void>
  /**
   * Run Alfred workflow trigger
   *
   * @param trigger - The identifier of the trigger. Does not accept null.
   * @param inWorkflow - The workflow bundle identifier. Does not accept null.
   * @param withArgument - An optional argument. Does not accept null.
   */
  runTrigger(
    trigger: string,
    inWorkflow: string,
    withArgument?: string,
    options?: CallOptions
  ): Promise<void>
  /**
   * Reload Workflow with given UID (folder name) or Bundle ID
   *
   * @param workflow - The UID (folder name), or the Bundle ID of the workflow to reload. Does not
   * accept null.
   */
  reloadWorkflow(workflow: string, options?: CallOptions): Promise<void>
  /**
   * Reveal Workflow with given UID (folder name) or Bundle ID
   *
   * @param workflow - The UID (folder name), or the Bundle ID of the workflow to reveal. Does not
   * accept null.
   * @param configuration - Optionally open the configuration for this workflow. Does not accept
   * null.
   * @param details - Optionally open the details for this workflow. Does not accept null.
   */
  revealWorkflow(
    workflow: string,
    configuration?: boolean,
    details?: boolean,
    options?: CallOptions
  ): Promise<void>
  /**
   * Modify workflow configuration value, or set environment variable
   *
   * @param variable - The name of the variable. Does not accept null.
   * @param toValue - The value to set. Does not accept null.
   * @param inWorkflow - The workflow bundle identifier. Does not accept null.
   * @param exportable - If this environment variable is fine for export, i.e. the Don't Export box
   * is left unchecked (Defaults to Don't Export). This option is ignored for workflow configuration
   * items. Does not accept null.
   */
  setConfiguration(
    variable: string,
    toValue: string,
    inWorkflow: string,
    exportable?: boolean,
    options?: CallOptions
  ): Promise<void>
  /**
   * Revert workflow configuration value to default, or delete environment variable
   *
   * @param variable - The name of the variable. Does not accept null.
   * @param inWorkflow - The workflow bundle identifier. Does not accept null.
   */
  removeConfiguration(variable: string, inWorkflow: string, options?: CallOptions): Promise<void>
  /**
   * Change theme in Alfred
   *
   * @param theme - The name of the theme to switch to. Does not accept null.
   */
  setTheme(theme: string, options?: CallOptions): Promise<void>
}

/**
 * The type of the resource table of {@link alfredContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), and the operations that resolve
 * references to it. A client created from the contract carries it, so
 * `bindReference` admits only references the contract can resolve.
 */
export type AlfredResources = Readonly<Record<never, never>>

/**
 * The resource table: the implementation of {@link AlfredResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {} satisfies AlfredResources

const appSearchOperation: OperationDescriptor<{ readonly query?: string | undefined }, undefined> =
  {
    id: 'alfred.app.search',
    permission: 'alfred:app:search',
    target: { command: 'search' },
    description: 'Show Alfred with the given text',
    input: t.record({
      query: t.optional(t.string({ description: 'The search string to populate Alfred with' })),
    }),
    output: t.none(),
    inputJsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search string to populate Alfred with' },
      },
      additionalProperties: false,
    },
  }

const appActionOperation: OperationDescriptor<
  { readonly items: readonly string[]; readonly asType?: string | undefined },
  undefined
> = {
  id: 'alfred.app.action',
  permission: 'alfred:app:action',
  target: { command: 'action' },
  description: 'Show Alfred actions for the given file',
  input: t.record({
    items: t.array(t.string(), { description: 'The items to show actions for' }),
    asType: t.optional(
      t.string({ description: 'An optional type for the items - file, url or text' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { type: 'string' },
        description: 'The items to show actions for',
      },
      asType: { type: 'string', description: 'An optional type for the items - file, url or text' },
    },
    required: ['items'],
    additionalProperties: false,
  },
}

const appBrowseOperation: OperationDescriptor<{ readonly path: string }, undefined> = {
  id: 'alfred.app.browse',
  permission: 'alfred:app:browse',
  target: { command: 'browse' },
  description: 'Show Alfred file system navigation for given path',
  input: t.record({
    path: t.string({ description: 'The path or search string to browse' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { path: { type: 'string', description: 'The path or search string to browse' } },
    required: ['path'],
    additionalProperties: false,
  },
}

const appRunTriggerOperation: OperationDescriptor<
  {
    readonly trigger: string
    readonly inWorkflow: string
    readonly withArgument?: string | undefined
  },
  undefined
> = {
  id: 'alfred.app.runTrigger',
  permission: 'alfred:workflows:runTrigger',
  target: { command: 'runTrigger' },
  description: 'Run Alfred workflow trigger',
  input: t.record({
    trigger: t.string({ description: 'The identifier of the trigger' }),
    inWorkflow: t.string({ description: 'The workflow bundle identifier' }),
    withArgument: t.optional(t.string({ description: 'An optional argument' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      trigger: { type: 'string', description: 'The identifier of the trigger' },
      inWorkflow: { type: 'string', description: 'The workflow bundle identifier' },
      withArgument: { type: 'string', description: 'An optional argument' },
    },
    required: ['trigger', 'inWorkflow'],
    additionalProperties: false,
  },
}

const appReloadWorkflowOperation: OperationDescriptor<{ readonly workflow: string }, undefined> = {
  id: 'alfred.app.reloadWorkflow',
  permission: 'alfred:workflows:reload',
  target: { command: 'reloadWorkflow' },
  description: 'Reload Workflow with given UID (folder name) or Bundle ID',
  input: t.record({
    workflow: t.string({
      description: 'The UID (folder name), or the Bundle ID of the workflow to reload',
    }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      workflow: {
        type: 'string',
        description: 'The UID (folder name), or the Bundle ID of the workflow to reload',
      },
    },
    required: ['workflow'],
    additionalProperties: false,
  },
}

const appRevealWorkflowOperation: OperationDescriptor<
  {
    readonly workflow: string
    readonly configuration?: boolean | undefined
    readonly details?: boolean | undefined
  },
  undefined
> = {
  id: 'alfred.app.revealWorkflow',
  permission: 'alfred:workflows:reveal',
  target: { command: 'revealWorkflow' },
  description: 'Reveal Workflow with given UID (folder name) or Bundle ID',
  input: t.record({
    workflow: t.string({
      description: 'The UID (folder name), or the Bundle ID of the workflow to reveal',
    }),
    configuration: t.optional(
      t.boolean({ description: 'Optionally open the configuration for this workflow' })
    ),
    details: t.optional(
      t.boolean({ description: 'Optionally open the details for this workflow' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      workflow: {
        type: 'string',
        description: 'The UID (folder name), or the Bundle ID of the workflow to reveal',
      },
      configuration: {
        type: 'boolean',
        description: 'Optionally open the configuration for this workflow',
      },
      details: { type: 'boolean', description: 'Optionally open the details for this workflow' },
    },
    required: ['workflow'],
    additionalProperties: false,
  },
}

const appSetConfigurationOperation: OperationDescriptor<
  {
    readonly variable: string
    readonly toValue: string
    readonly inWorkflow: string
    readonly exportable?: boolean | undefined
  },
  undefined
> = {
  id: 'alfred.app.setConfiguration',
  permission: 'alfred:workflows:setConfiguration',
  target: { command: 'setConfiguration' },
  description: 'Modify workflow configuration value, or set environment variable',
  input: t.record({
    variable: t.string({ description: 'The name of the variable' }),
    toValue: t.string({ description: 'The value to set' }),
    inWorkflow: t.string({ description: 'The workflow bundle identifier' }),
    exportable: t.optional(
      t.boolean({
        description:
          "If this environment variable is fine for export, i.e. the Don't Export box is left unchecked (Defaults to Don't Export). This option is ignored for workflow configuration items",
      })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      variable: { type: 'string', description: 'The name of the variable' },
      toValue: { type: 'string', description: 'The value to set' },
      inWorkflow: { type: 'string', description: 'The workflow bundle identifier' },
      exportable: {
        type: 'boolean',
        description:
          "If this environment variable is fine for export, i.e. the Don't Export box is left unchecked (Defaults to Don't Export). This option is ignored for workflow configuration items",
      },
    },
    required: ['variable', 'toValue', 'inWorkflow'],
    additionalProperties: false,
  },
}

const appRemoveConfigurationOperation: OperationDescriptor<
  { readonly variable: string; readonly inWorkflow: string },
  undefined
> = {
  id: 'alfred.app.removeConfiguration',
  permission: 'alfred:workflows:removeConfiguration',
  target: { command: 'removeConfiguration' },
  description: 'Revert workflow configuration value to default, or delete environment variable',
  input: t.record({
    variable: t.string({ description: 'The name of the variable' }),
    inWorkflow: t.string({ description: 'The workflow bundle identifier' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      variable: { type: 'string', description: 'The name of the variable' },
      inWorkflow: { type: 'string', description: 'The workflow bundle identifier' },
    },
    required: ['variable', 'inWorkflow'],
    additionalProperties: false,
  },
}

const appSetThemeOperation: OperationDescriptor<{ readonly theme: string }, undefined> = {
  id: 'alfred.app.setTheme',
  permission: 'alfred:app:setTheme',
  target: { command: 'setTheme' },
  description: 'Change theme in Alfred',
  input: t.record({
    theme: t.string({ description: 'The name of the theme to switch to' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { theme: { type: 'string', description: 'The name of the theme to switch to' } },
    required: ['theme'],
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<AlfredClient>['operations'] = {
  'alfred.app.search': appSearchOperation,
  'alfred.app.action': appActionOperation,
  'alfred.app.browse': appBrowseOperation,
  'alfred.app.runTrigger': appRunTriggerOperation,
  'alfred.app.reloadWorkflow': appReloadWorkflowOperation,
  'alfred.app.revealWorkflow': appRevealWorkflowOperation,
  'alfred.app.setConfiguration': appSetConfigurationOperation,
  'alfred.app.removeConfiguration': appRemoveConfigurationOperation,
  'alfred.app.setTheme': appSetThemeOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): AlfredClient {
  return {
    search: (query, options) => runtime.invoke(appSearchOperation, { query }, options),
    action: (items, asType, options) =>
      runtime.invoke(appActionOperation, { items, asType }, options),
    browse: (path, options) => runtime.invoke(appBrowseOperation, { path }, options),
    runTrigger: (trigger, inWorkflow, withArgument, options) =>
      runtime.invoke(appRunTriggerOperation, { trigger, inWorkflow, withArgument }, options),
    reloadWorkflow: (workflow, options) =>
      runtime.invoke(appReloadWorkflowOperation, { workflow }, options),
    revealWorkflow: (workflow, configuration, details, options) =>
      runtime.invoke(appRevealWorkflowOperation, { workflow, configuration, details }, options),
    setConfiguration: (variable, toValue, inWorkflow, exportable, options) =>
      runtime.invoke(
        appSetConfigurationOperation,
        { variable, toValue, inWorkflow, exportable },
        options
      ),
    removeConfiguration: (variable, inWorkflow, options) =>
      runtime.invoke(appRemoveConfigurationOperation, { variable, inWorkflow }, options),
    setTheme: (theme, options) => runtime.invoke(appSetThemeOperation, { theme }, options),
  }
}

/**
 * The Alfred contract. Pass it to a client factory to obtain a
 * {@link AlfredClient}.
 */
export const alfredContract: AppContract<AlfredClient, AlfredResources> = {
  app: 'alfred',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
