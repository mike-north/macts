import type { CliPlugin } from '@macts/cli'
import { ListDocumentsCommand } from './commands/documents/list.js'
import { GetDocumentCommand } from './commands/documents/get.js'
import { SaveDocumentCommand } from './commands/documents/save.js'
import { SaveAsDocumentCommand } from './commands/documents/save-as.js'
import { CloseDocumentCommand } from './commands/documents/close.js'
import { PrintDocumentCommand } from './commands/documents/print.js'
import { ActivateDocumentCommand } from './commands/documents/activate.js'
import { CreateRangeDocumentCommand } from './commands/documents/create-range.js'
import { UndoCommand } from './commands/undo.js'
import { RedoCommand } from './commands/redo.js'
import { CopyObjectCommand } from './commands/copy-object.js'
import { CutObjectCommand } from './commands/cut-object.js'
import { PasteObjectCommand } from './commands/paste-object.js'
import { SelectAllCommand } from './commands/select-all.js'
import { FindCommand } from './commands/find.js'
import { ReplaceCommand } from './commands/replace.js'
import { InsertTextCommand } from './commands/insert-text.js'
import { CreateNewDocumentCommand } from './commands/create-new-document.js'

/**
 * CLI plugin for Microsoft Word.
 */
export const plugin: CliPlugin = {
  name: 'microsoft-word',
  description: 'Commands for Microsoft Word',
  commands: [
    ListDocumentsCommand,
    GetDocumentCommand,
    SaveDocumentCommand,
    SaveAsDocumentCommand,
    CloseDocumentCommand,
    PrintDocumentCommand,
    ActivateDocumentCommand,
    CreateRangeDocumentCommand,
    UndoCommand,
    RedoCommand,
    CopyObjectCommand,
    CutObjectCommand,
    PasteObjectCommand,
    SelectAllCommand,
    FindCommand,
    ReplaceCommand,
    InsertTextCommand,
    CreateNewDocumentCommand,
  ],
}
