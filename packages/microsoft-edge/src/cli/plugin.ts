import type { CliPlugin } from '@macts/cli'
import { ListWindowsCommand } from './commands/windows/list.js'
import { GetWindowCommand } from './commands/windows/get.js'
import { ListTabsCommand } from './commands/windows/tabs/list.js'
import { GetTabCommand } from './commands/windows/tabs/get.js'
import { ReloadTabCommand } from './commands/windows/tabs/reload.js'
import { GoBackTabCommand } from './commands/windows/tabs/go-back.js'
import { GoForwardTabCommand } from './commands/windows/tabs/go-forward.js'
import { SelectAllTabCommand } from './commands/windows/tabs/select-all.js'
import { CutSelectionTabCommand } from './commands/windows/tabs/cut-selection.js'
import { CopySelectionTabCommand } from './commands/windows/tabs/copy-selection.js'
import { PasteSelectionTabCommand } from './commands/windows/tabs/paste-selection.js'
import { UndoTabCommand } from './commands/windows/tabs/undo.js'
import { RedoTabCommand } from './commands/windows/tabs/redo.js'
import { StopTabCommand } from './commands/windows/tabs/stop.js'
import { ViewSourceTabCommand } from './commands/windows/tabs/view-source.js'
import { ExecuteTabCommand } from './commands/windows/tabs/execute.js'
import { ListBookmarkFoldersCommand } from './commands/bookmarkFolders/list.js'
import { GetBookmarkFolderCommand } from './commands/bookmarkFolders/get.js'
import { ListBookmarkItemsCommand } from './commands/bookmarkFolders/bookmarkItems/list.js'
import { GetBookmarkItemCommand } from './commands/bookmarkFolders/bookmarkItems/get.js'

/**
 * CLI plugin for Microsoft Edge.
 */
export const plugin: CliPlugin = {
  name: 'microsoft-edge',
  description: 'Commands for Microsoft Edge',
  commands: [
    ListWindowsCommand,
    GetWindowCommand,
    ListTabsCommand,
    GetTabCommand,
    ReloadTabCommand,
    GoBackTabCommand,
    GoForwardTabCommand,
    SelectAllTabCommand,
    CutSelectionTabCommand,
    CopySelectionTabCommand,
    PasteSelectionTabCommand,
    UndoTabCommand,
    RedoTabCommand,
    StopTabCommand,
    ViewSourceTabCommand,
    ExecuteTabCommand,
    ListBookmarkFoldersCommand,
    GetBookmarkFolderCommand,
    ListBookmarkItemsCommand,
    GetBookmarkItemCommand,
  ],
}
