import type { CliPlugin } from '@macts/cli';
import { ListWindowsCommand } from './commands/windows/list.js';
import { GetWindowCommand } from './commands/windows/get.js';
import { ListSettingsSetsCommand } from './commands/settingsSets/list.js';
import { CreateSettingsSetCommand } from './commands/settingsSets/create.js';
import { GetSettingsSetCommand } from './commands/settingsSets/get.js';
import { DoScriptCommand } from './commands/do-script.js';

/**
 * CLI plugin for Terminal.
 */
export const plugin: CliPlugin = {
  name: 'terminal',
  description: 'Commands for Terminal',
  commands: [
    ListWindowsCommand,
    GetWindowCommand,
    ListSettingsSetsCommand,
    CreateSettingsSetCommand,
    GetSettingsSetCommand,
    DoScriptCommand,
  ],
};
