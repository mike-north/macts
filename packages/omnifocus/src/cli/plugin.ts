import type { CliPlugin } from '@macts/cli'
import { ListFoldersCommand } from './commands/folders/list.js'
import { CreateFolderCommand } from './commands/folders/create.js'
import { GetFolderCommand } from './commands/folders/get.js'
import { ListProjectsCommand } from './commands/folders/projects/list.js'
import { CreateProjectCommand } from './commands/folders/projects/create.js'
import { GetProjectCommand } from './commands/folders/projects/get.js'
import { ListTasksCommand } from './commands/projects/tasks/list.js'
import { CreateTaskCommand } from './commands/projects/tasks/create.js'
import { GetTaskCommand } from './commands/projects/tasks/get.js'
import { ListTagsCommand } from './commands/tags/list.js'
import { CreateTagCommand } from './commands/tags/create.js'
import { GetTagCommand } from './commands/tags/get.js'
import { ListInboxTasksCommand } from './commands/inboxTasks/list.js'
import { CreateInboxTaskCommand } from './commands/inboxTasks/create.js'
import { GetInboxTaskCommand } from './commands/inboxTasks/get.js'
import { ListPerspectivesCommand } from './commands/perspectives/list.js'
import { GetPerspectiveCommand } from './commands/perspectives/get.js'
import { CompleteCommand } from './commands/complete.js'
import { MarkCompleteCommand } from './commands/mark-complete.js'
import { MarkIncompleteCommand } from './commands/mark-incomplete.js'
import { MarkDroppedCommand } from './commands/mark-dropped.js'
import { ParseTasksIntoCommand } from './commands/parse-tasks-into.js'
import { ArchiveCommand } from './commands/archive.js'
import { CompactCommand } from './commands/compact.js'
import { SynchronizeCommand } from './commands/synchronize.js'
import { ImportIntoCommand } from './commands/import-into.js'
import { UndoCommand } from './commands/undo.js'
import { RedoCommand } from './commands/redo.js'

/**
 * CLI plugin for OmniFocus.
 */
export const plugin: CliPlugin = {
  name: 'omnifocus',
  description: 'Commands for OmniFocus',
  commands: [
    ListFoldersCommand,
    CreateFolderCommand,
    GetFolderCommand,
    ListProjectsCommand,
    CreateProjectCommand,
    GetProjectCommand,
    ListTasksCommand,
    CreateTaskCommand,
    GetTaskCommand,
    ListTagsCommand,
    CreateTagCommand,
    GetTagCommand,
    ListInboxTasksCommand,
    CreateInboxTaskCommand,
    GetInboxTaskCommand,
    ListPerspectivesCommand,
    GetPerspectiveCommand,
    CompleteCommand,
    MarkCompleteCommand,
    MarkIncompleteCommand,
    MarkDroppedCommand,
    ParseTasksIntoCommand,
    ArchiveCommand,
    CompactCommand,
    SynchronizeCommand,
    ImportIntoCommand,
    UndoCommand,
    RedoCommand,
  ],
}
