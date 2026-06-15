import type { CliPlugin } from '@macts/cli'
import { ListWorkspaceDocumentsCommand } from './commands/workspaceDocuments/list.js'
import { GetWorkspaceDocumentCommand } from './commands/workspaceDocuments/get.js'
import { BuildWorkspaceDocumentCommand } from './commands/workspaceDocuments/build.js'
import { CleanWorkspaceDocumentCommand } from './commands/workspaceDocuments/clean.js'
import { StopWorkspaceDocumentCommand } from './commands/workspaceDocuments/stop.js'
import { RunWorkspaceDocumentCommand } from './commands/workspaceDocuments/run.js'
import { TestWorkspaceDocumentCommand } from './commands/workspaceDocuments/test.js'
import { AttachWorkspaceDocumentCommand } from './commands/workspaceDocuments/attach.js'
import { DebugWorkspaceDocumentCommand } from './commands/workspaceDocuments/debug.js'
import { ListProjectsCommand } from './commands/workspaceDocuments/projects/list.js'
import { GetProjectCommand } from './commands/workspaceDocuments/projects/get.js'
import { ListSchemesCommand } from './commands/workspaceDocuments/schemes/list.js'
import { GetSchemeCommand } from './commands/workspaceDocuments/schemes/get.js'
import { ListRunDestinationsCommand } from './commands/workspaceDocuments/runDestinations/list.js'
import { GetRunDestinationCommand } from './commands/workspaceDocuments/runDestinations/get.js'

/**
 * CLI plugin for Xcode.
 */
export const plugin: CliPlugin = {
  name: 'xcode',
  description: 'Commands for Xcode',
  commands: [
    ListWorkspaceDocumentsCommand,
    GetWorkspaceDocumentCommand,
    BuildWorkspaceDocumentCommand,
    CleanWorkspaceDocumentCommand,
    StopWorkspaceDocumentCommand,
    RunWorkspaceDocumentCommand,
    TestWorkspaceDocumentCommand,
    AttachWorkspaceDocumentCommand,
    DebugWorkspaceDocumentCommand,
    ListProjectsCommand,
    GetProjectCommand,
    ListSchemesCommand,
    GetSchemeCommand,
    ListRunDestinationsCommand,
    GetRunDestinationCommand,
  ],
}
