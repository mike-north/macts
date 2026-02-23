import type { CliPlugin } from '@macts/cli';
import { ListDocumentsCommand } from './commands/documents/list.js';
import { GetDocumentCommand } from './commands/documents/get.js';

/**
 * CLI plugin for Preview.
 */
export const plugin: CliPlugin = {
  name: 'preview',
  description: 'Commands for Preview',
  commands: [
    ListDocumentsCommand,
    GetDocumentCommand,
  ],
};
