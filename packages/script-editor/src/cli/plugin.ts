import type { CliPlugin } from '@macts/cli'
import { ListDocumentsCommand } from './commands/documents/list.js'
import { CreateDocumentCommand } from './commands/documents/create.js'
import { GetDocumentCommand } from './commands/documents/get.js'

/**
 * CLI plugin for Script Editor.
 */
export const plugin: CliPlugin = {
  name: 'script-editor',
  description: 'Commands for Script Editor',
  commands: [ListDocumentsCommand, CreateDocumentCommand, GetDocumentCommand],
}
