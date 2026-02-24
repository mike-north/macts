import type { CliPlugin } from '@macts/cli'
import { ListWorkflowsCommand } from './commands/workflows/list.js'
import { CreateWorkflowCommand } from './commands/workflows/create.js'
import { GetWorkflowCommand } from './commands/workflows/get.js'
import { ExecuteWorkflowCommand } from './commands/workflows/execute.js'
import { ListAutomatorActionsCommand } from './commands/workflows/actions/list.js'
import { CreateAutomatorActionCommand } from './commands/workflows/actions/create.js'
import { GetAutomatorActionCommand } from './commands/workflows/actions/get.js'
import { ListSettingsCommand } from './commands/workflows/actions/settings/list.js'
import { CreateSettingCommand } from './commands/workflows/actions/settings/create.js'
import { GetSettingCommand } from './commands/workflows/actions/settings/get.js'
import { ListRequiredResourcesCommand } from './commands/workflows/actions/requiredResources/list.js'
import { GetRequiredResourceCommand } from './commands/workflows/actions/requiredResources/get.js'
import { ListVariablesCommand } from './commands/workflows/variables/list.js'
import { CreateVariableCommand } from './commands/workflows/variables/create.js'
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
    CreateWorkflowCommand,
    GetWorkflowCommand,
    ExecuteWorkflowCommand,
    ListAutomatorActionsCommand,
    CreateAutomatorActionCommand,
    GetAutomatorActionCommand,
    ListSettingsCommand,
    CreateSettingCommand,
    GetSettingCommand,
    ListRequiredResourcesCommand,
    GetRequiredResourceCommand,
    ListVariablesCommand,
    CreateVariableCommand,
    GetVariableCommand,
    AddCommand,
    RemoveCommand,
  ],
}
