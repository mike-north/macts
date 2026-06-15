import type { CliPlugin } from '@macts/cli'
import { ListAccountsCommand } from './commands/accounts/list.js'
import { GetAccountCommand } from './commands/accounts/get.js'
import { ListFoldersCommand } from './commands/folders/list.js'
import { GetFolderCommand } from './commands/folders/get.js'
import { ListNotesCommand } from './commands/notes/list.js'
import { CreateNoteCommand } from './commands/notes/create.js'
import { GetNoteCommand } from './commands/notes/get.js'
import { ShowNoteCommand } from './commands/notes/show.js'

/**
 * CLI plugin for Notes.
 */
export const plugin: CliPlugin = {
  name: 'notes',
  description: 'Commands for Notes',
  commands: [
    ListAccountsCommand,
    GetAccountCommand,
    ListFoldersCommand,
    GetFolderCommand,
    ListNotesCommand,
    CreateNoteCommand,
    GetNoteCommand,
    ShowNoteCommand,
  ],
}
