import type { CliPlugin } from '@macts/cli'
import { ListShortcutsCommand } from './commands/shortcuts/list.js'
import { CreateShortcutCommand } from './commands/shortcuts/create.js'
import { GetShortcutCommand } from './commands/shortcuts/get.js'
import { RunShortcutCommand } from './commands/shortcuts/run.js'
import { ListFoldersCommand } from './commands/folders/list.js'
import { CreateFolderCommand } from './commands/folders/create.js'
import { GetFolderCommand } from './commands/folders/get.js'

/**
 * CLI plugin for Shortcuts.
 */
export const plugin: CliPlugin = {
  name: 'shortcuts',
  description: 'Commands for Shortcuts',
  commands: [
    ListShortcutsCommand,
    CreateShortcutCommand,
    GetShortcutCommand,
    RunShortcutCommand,
    ListFoldersCommand,
    CreateFolderCommand,
    GetFolderCommand,
  ],
}
