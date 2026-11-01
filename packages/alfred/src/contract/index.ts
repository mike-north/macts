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
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `AlfredClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { alfredContract } from '@macts/alfred/contract'
 *
 * const client = createClient(alfredContract, { token, url })
 * ```
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
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** The Alfred application */
export interface Application {
  /** The name of the application */
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
  /** Show Alfred with the given text */
  search(query?: string, options?: CallOptions): Promise<void>
  /** Show Alfred actions for the given file */
  action(items: readonly string[], asType?: string, options?: CallOptions): Promise<void>
  /** Show Alfred file system navigation for given path */
  browse(path: string, options?: CallOptions): Promise<void>
  /** Run Alfred workflow trigger */
  runTrigger(
    trigger: string,
    inWorkflow: string,
    withArgument?: string,
    options?: CallOptions
  ): Promise<void>
  /** Reload Workflow with given UID (folder name) or Bundle ID */
  reloadWorkflow(workflow: string, options?: CallOptions): Promise<void>
  /** Reveal Workflow with given UID (folder name) or Bundle ID */
  revealWorkflow(
    workflow: string,
    configuration?: boolean,
    details?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Modify workflow configuration value, or set environment variable */
  setConfiguration(
    variable: string,
    toValue: string,
    inWorkflow: string,
    exportable?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Revert workflow configuration value to default, or delete environment variable */
  removeConfiguration(variable: string, inWorkflow: string, options?: CallOptions): Promise<void>
  /** Change theme in Alfred */
  setTheme(theme: string, options?: CallOptions): Promise<void>
}

const applicationRecordType: ValueType<Application> = t.record(
  {
    name: t.string({ description: 'The name of the application' }),
  },
  { description: 'The Alfred application' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<AlfredClient>['resources'] = {
  Application: {
    name: 'Application',
    record: applicationRecordType,
    id: t.string({ description: 'The name of the application' }),
  },
}

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
export const alfredContract: AppContract<AlfredClient> = {
  app: 'alfred',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
