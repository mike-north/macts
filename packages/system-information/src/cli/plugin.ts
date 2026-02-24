import type { CliPlugin } from '@macts/cli'
import { ListDocumentsCommand } from './commands/documents/list.js'
import { CreateDocumentCommand } from './commands/documents/create.js'
import { GetDocumentCommand } from './commands/documents/get.js'
import { SendCommand } from './commands/send.js'

/**
 * CLI plugin for System Information.
 */
export const plugin: CliPlugin = {
  name: 'system-information',
  description: 'Commands for System Information',
  commands: [ListDocumentsCommand, CreateDocumentCommand, GetDocumentCommand, SendCommand],
}
