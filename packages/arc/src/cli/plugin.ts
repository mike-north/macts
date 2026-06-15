import type { CliPlugin } from '@macts/cli'
import { MakeCommand } from './commands/make.js'
import { CountCommand } from './commands/count.js'
import { CloseCommand } from './commands/close.js'
import { SelectCommand } from './commands/select.js'
import { GoBackCommand } from './commands/go-back.js'
import { GoForwardCommand } from './commands/go-forward.js'
import { ReloadCommand } from './commands/reload.js'
import { StopCommand } from './commands/stop.js'
import { ExecuteCommand } from './commands/execute.js'
import { FocusCommand } from './commands/focus.js'

/**
 * CLI plugin for Arc.
 */
export const plugin: CliPlugin = {
  name: 'arc',
  description: 'Commands for Arc',
  commands: [
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
}
