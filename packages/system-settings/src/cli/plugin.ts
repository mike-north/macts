import type { CliPlugin } from '@macts/cli';
import { ListPanesCommand } from './commands/panes/list.js';
import { GetPaneCommand } from './commands/panes/get.js';
import { AuthorizePaneCommand } from './commands/panes/authorize.js';
import { TimedLoadPaneCommand } from './commands/panes/timed-load.js';
import { ListAnchorsCommand } from './commands/panes/anchors/list.js';
import { GetAnchorCommand } from './commands/panes/anchors/get.js';
import { RevealCommand } from './commands/reveal.js';

/**
 * CLI plugin for System Settings.
 */
export const plugin: CliPlugin = {
  name: 'system-settings',
  description: 'Commands for System Settings',
  commands: [
    ListPanesCommand,
    GetPaneCommand,
    AuthorizePaneCommand,
    TimedLoadPaneCommand,
    ListAnchorsCommand,
    GetAnchorCommand,
    RevealCommand,
  ],
};
