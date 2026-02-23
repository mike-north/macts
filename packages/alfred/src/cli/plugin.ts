import type { CliPlugin } from '@macts/cli';
import { SearchCommand } from './commands/search.js';
import { ActionCommand } from './commands/action.js';
import { BrowseCommand } from './commands/browse.js';
import { RunTriggerCommand } from './commands/run-trigger.js';
import { ReloadWorkflowCommand } from './commands/reload-workflow.js';
import { RevealWorkflowCommand } from './commands/reveal-workflow.js';
import { SetConfigurationCommand } from './commands/set-configuration.js';
import { RemoveConfigurationCommand } from './commands/remove-configuration.js';
import { SetThemeCommand } from './commands/set-theme.js';

/**
 * CLI plugin for Alfred.
 */
export const plugin: CliPlugin = {
  name: 'alfred',
  description: 'Commands for Alfred',
  commands: [
    SearchCommand,
    ActionCommand,
    BrowseCommand,
    RunTriggerCommand,
    ReloadWorkflowCommand,
    RevealWorkflowCommand,
    SetConfigurationCommand,
    RemoveConfigurationCommand,
    SetThemeCommand,
  ],
};
