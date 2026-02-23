import type { CliPlugin } from '@macts/cli';
import { ListDocumentsCommand } from './commands/documents/list.js';
import { CreateDocumentCommand } from './commands/documents/create.js';
import { GetDocumentCommand } from './commands/documents/get.js';

/**
 * CLI plugin for TextEdit.
 */
export const plugin: CliPlugin = {
  name: 'textedit',
  description: 'Commands for TextEdit',
  commands: [
    ListDocumentsCommand,
    CreateDocumentCommand,
    GetDocumentCommand,
  ],
};
