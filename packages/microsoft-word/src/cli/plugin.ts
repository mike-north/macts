import type { CliPlugin } from '@macts/cli'
import { ListDocumentsCommand } from './commands/documents/list.js'
import { CreateDocumentCommand } from './commands/documents/create.js'
import { GetDocumentCommand } from './commands/documents/get.js'
import { SaveDocumentCommand } from './commands/documents/save.js'
import { SaveAsDocumentCommand } from './commands/documents/save-as.js'
import { CloseDocumentCommand } from './commands/documents/close.js'
import { PrintDocumentCommand } from './commands/documents/print.js'
import { ActivateDocumentCommand } from './commands/documents/activate.js'
import { CreateRangeDocumentCommand } from './commands/documents/create-range.js'
import { ListParagraphsCommand } from './commands/documents/paragraphs/list.js'
import { CreateParagraphCommand } from './commands/documents/paragraphs/create.js'
import { GetParagraphCommand } from './commands/documents/paragraphs/get.js'
import { ListSectionsCommand } from './commands/documents/sections/list.js'
import { CreateSectionCommand } from './commands/documents/sections/create.js'
import { GetSectionCommand } from './commands/documents/sections/get.js'
import { ListTablesCommand } from './commands/documents/tables/list.js'
import { CreateTableCommand } from './commands/documents/tables/create.js'
import { GetTableCommand } from './commands/documents/tables/get.js'
import { ListRowsCommand } from './commands/documents/tables/rows/list.js'
import { CreateRowCommand } from './commands/documents/tables/rows/create.js'
import { GetRowCommand } from './commands/documents/tables/rows/get.js'
import { ListCellsCommand } from './commands/documents/tables/rows/cells/list.js'
import { CreateCellCommand } from './commands/documents/tables/rows/cells/create.js'
import { GetCellCommand } from './commands/documents/tables/rows/cells/get.js'
import { ListColumnsCommand } from './commands/documents/tables/columns/list.js'
import { CreateColumnCommand } from './commands/documents/tables/columns/create.js'
import { GetColumnCommand } from './commands/documents/tables/columns/get.js'
import { ListBookmarksCommand } from './commands/documents/bookmarks/list.js'
import { CreateBookmarkCommand } from './commands/documents/bookmarks/create.js'
import { GetBookmarkCommand } from './commands/documents/bookmarks/get.js'
import { ListFieldsCommand } from './commands/documents/fields/list.js'
import { CreateFieldCommand } from './commands/documents/fields/create.js'
import { GetFieldCommand } from './commands/documents/fields/get.js'
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
    CreateDocumentCommand,
    GetDocumentCommand,
    SaveDocumentCommand,
    SaveAsDocumentCommand,
    CloseDocumentCommand,
    PrintDocumentCommand,
    ActivateDocumentCommand,
    CreateRangeDocumentCommand,
    ListParagraphsCommand,
    CreateParagraphCommand,
    GetParagraphCommand,
    ListSectionsCommand,
    CreateSectionCommand,
    GetSectionCommand,
    ListTablesCommand,
    CreateTableCommand,
    GetTableCommand,
    ListRowsCommand,
    CreateRowCommand,
    GetRowCommand,
    ListCellsCommand,
    CreateCellCommand,
    GetCellCommand,
    ListColumnsCommand,
    CreateColumnCommand,
    GetColumnCommand,
    ListBookmarksCommand,
    CreateBookmarkCommand,
    GetBookmarkCommand,
    ListFieldsCommand,
    CreateFieldCommand,
    GetFieldCommand,
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
