import type { CliPlugin } from '@macts/cli'
import { OpenCommand } from './commands/open.js'
import { PrintCommand } from './commands/print.js'
import { QuitCommand } from './commands/quit.js'
import { ActivateCommand } from './commands/activate.js'
import { CloseCommand } from './commands/close.js'
import { CountCommand } from './commands/count.js'
import { DataSizeCommand } from './commands/data-size.js'
import { DeleteCommand } from './commands/delete.js'
import { DuplicateCommand } from './commands/duplicate.js'
import { ExistsCommand } from './commands/exists.js'
import { MakeCommand } from './commands/make.js'
import { MoveCommand } from './commands/move.js'
import { SelectCommand } from './commands/select.js'
import { OpenVirtualLocationCommand } from './commands/open-virtual-location.js'
import { CopyCommand } from './commands/copy.js'
import { SortCommand } from './commands/sort.js'
import { CleanUpCommand } from './commands/clean-up.js'
import { EjectCommand } from './commands/eject.js'
import { EmptyCommand } from './commands/empty.js'
import { EraseCommand } from './commands/erase.js'
import { RevealCommand } from './commands/reveal.js'
import { UpdateCommand } from './commands/update.js'
import { RestartCommand } from './commands/restart.js'
import { ShutDownCommand } from './commands/shut-down.js'
import { SleepCommand } from './commands/sleep.js'

/**
 * CLI plugin for Finder.
 */
export const plugin: CliPlugin = {
  name: 'finder',
  description: 'Commands for Finder',
  commands: [
    OpenCommand,
    PrintCommand,
    QuitCommand,
    ActivateCommand,
    CloseCommand,
    CountCommand,
    DataSizeCommand,
    DeleteCommand,
    DuplicateCommand,
    ExistsCommand,
    MakeCommand,
    MoveCommand,
    SelectCommand,
    OpenVirtualLocationCommand,
    CopyCommand,
    SortCommand,
    CleanUpCommand,
    EjectCommand,
    EmptyCommand,
    EraseCommand,
    RevealCommand,
    UpdateCommand,
    RestartCommand,
    ShutDownCommand,
    SleepCommand,
  ],
}
