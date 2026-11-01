import type { CliPlugin } from '@macts/cli'
import { ListWorkflowsCommand } from './commands/workflows/list.js'
import { GetWorkflowCommand } from './commands/workflows/get.js'
import { ExecuteWorkflowCommand } from './commands/workflows/execute.js'
import { ListAutomatorActionsCommand } from './commands/workflows/actions/list.js'
import { GetAutomatorActionCommand } from './commands/workflows/actions/get.js'
import { ListSettingsCommand } from './commands/workflows/actions/settings/list.js'
import { ListRequiredResourcesCommand } from './commands/workflows/actions/requiredResources/list.js'
import { ListVariablesCommand } from './commands/workflows/variables/list.js'
import { GetVariableCommand } from './commands/workflows/variables/get.js'
import { AddCommand } from './commands/add.js'
import { RemoveCommand } from './commands/remove.js'

/**
 * CLI plugin for Automator.
 */
export const plugin: CliPlugin = {
  name: 'automator',
  description: 'Commands for Automator',
  commands: [
    ListWorkflowsCommand,
    GetWorkflowCommand,
    ExecuteWorkflowCommand,
    ListAutomatorActionsCommand,
    GetAutomatorActionCommand,
    ListSettingsCommand,
    ListRequiredResourcesCommand,
    ListVariablesCommand,
    GetVariableCommand,
    AddCommand,
    RemoveCommand,
  ],
}
