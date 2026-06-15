import type { CliPlugin } from '@macts/cli'
import { AuthorizePaneCommand } from './commands/panes/authorize.js'
import { TimedLoadPaneCommand } from './commands/panes/timed-load.js'
import { RevealCommand } from './commands/reveal.js'

/**
 * CLI plugin for System Settings.
 */
export const plugin: CliPlugin = {
  name: 'system-settings',
  description: 'Commands for System Settings',
  commands: [AuthorizePaneCommand, TimedLoadPaneCommand, RevealCommand],
}
