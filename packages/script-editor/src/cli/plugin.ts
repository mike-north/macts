import type { CliPlugin } from '@macts/cli';
import { ListDocumentsCommand } from './commands/documents/list.js';
import { CreateDocumentCommand } from './commands/documents/create.js';
import { GetDocumentCommand } from './commands/documents/get.js';

/**
 * CLI plugin for ScriptEditor.
 */
export const plugin: CliPlugin = {
  name: 'scripteditor',
  description: 'Commands for ScriptEditor',
  commands: [
    ListDocumentsCommand,
    CreateDocumentCommand,
    GetDocumentCommand,
  ],
};
