import type { CliPlugin } from '@macts/cli';
import { ListWindowsCommand } from './commands/windows/list.js';
import { CreateWindowCommand } from './commands/windows/create.js';
import { GetWindowCommand } from './commands/windows/get.js';
import { ListTabsCommand } from './commands/windows/tabs/list.js';
import { CreateTabCommand } from './commands/windows/tabs/create.js';
import { GetTabCommand } from './commands/windows/tabs/get.js';
import { ListSpacesCommand } from './commands/windows/spaces/list.js';
import { CreateSpaceCommand } from './commands/windows/spaces/create.js';
import { GetSpaceCommand } from './commands/windows/spaces/get.js';
import { MakeCommand } from './commands/make.js';
import { CountCommand } from './commands/count.js';
import { CloseCommand } from './commands/close.js';
import { SelectCommand } from './commands/select.js';
import { GoBackCommand } from './commands/go-back.js';
import { GoForwardCommand } from './commands/go-forward.js';
import { ReloadCommand } from './commands/reload.js';
import { StopCommand } from './commands/stop.js';
import { ExecuteCommand } from './commands/execute.js';
import { FocusCommand } from './commands/focus.js';

/**
 * CLI plugin for Arc.
 */
export const plugin: CliPlugin = {
  name: 'arc',
  description: 'Commands for Arc',
  commands: [
    ListWindowsCommand,
    CreateWindowCommand,
    GetWindowCommand,
    ListTabsCommand,
    CreateTabCommand,
    GetTabCommand,
    ListSpacesCommand,
    CreateSpaceCommand,
    GetSpaceCommand,
    MakeCommand,
    CountCommand,
    CloseCommand,
    SelectCommand,
    GoBackCommand,
    GoForwardCommand,
    ReloadCommand,
    StopCommand,
    ExecuteCommand,
    FocusCommand,
  ],
};
