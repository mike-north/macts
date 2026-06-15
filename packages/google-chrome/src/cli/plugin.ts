import type { CliPlugin } from '@macts/cli'
import { SaveCommand } from './commands/save.js'
import { OpenCommand } from './commands/open.js'
import { CloseCommand } from './commands/close.js'
import { QuitCommand } from './commands/quit.js'
import { CountCommand } from './commands/count.js'
import { DeleteCommand } from './commands/delete.js'
import { DuplicateCommand } from './commands/duplicate.js'
import { ExistsCommand } from './commands/exists.js'
import { MakeCommand } from './commands/make.js'
import { MoveCommand } from './commands/move.js'
import { PrintCommand } from './commands/print.js'
import { ReloadCommand } from './commands/reload.js'
import { GoBackCommand } from './commands/go-back.js'
import { GoForwardCommand } from './commands/go-forward.js'
import { SelectAllCommand } from './commands/select-all.js'
import { CutSelectionCommand } from './commands/cut-selection.js'
import { CopySelectionCommand } from './commands/copy-selection.js'
import { PasteSelectionCommand } from './commands/paste-selection.js'
import { UndoCommand } from './commands/undo.js'
import { RedoCommand } from './commands/redo.js'
import { StopCommand } from './commands/stop.js'
import { ViewSourceCommand } from './commands/view-source.js'
import { ExecuteCommand } from './commands/execute.js'

/**
 * CLI plugin for Google Chrome.
 */
export const plugin: CliPlugin = {
  name: 'google-chrome',
  description: 'Commands for Google Chrome',
  commands: [
    SaveCommand,
    OpenCommand,
    CloseCommand,
    QuitCommand,
    CountCommand,
    DeleteCommand,
    DuplicateCommand,
    ExistsCommand,
    MakeCommand,
    MoveCommand,
    PrintCommand,
    ReloadCommand,
    GoBackCommand,
    GoForwardCommand,
    SelectAllCommand,
    CutSelectionCommand,
    CopySelectionCommand,
    PasteSelectionCommand,
    UndoCommand,
    RedoCommand,
    StopCommand,
    ViewSourceCommand,
    ExecuteCommand,
  ],
}
