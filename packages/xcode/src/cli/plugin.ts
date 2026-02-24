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
import { ListTargetsCommand } from './commands/workspaceDocuments/projects/targets/list.js'
import { GetTargetCommand } from './commands/workspaceDocuments/projects/targets/get.js'
import { ListBuildConfigurationsCommand } from './commands/workspaceDocuments/projects/targets/buildConfigurations/list.js'
import { GetBuildConfigurationCommand } from './commands/workspaceDocuments/projects/targets/buildConfigurations/get.js'
import { ListBuildSettingsCommand } from './commands/workspaceDocuments/projects/targets/buildConfigurations/buildSettings/list.js'
import { GetBuildSettingCommand } from './commands/workspaceDocuments/projects/targets/buildConfigurations/buildSettings/get.js'
import { ListResolvedBuildSettingsCommand } from './commands/workspaceDocuments/projects/targets/buildConfigurations/resolvedBuildSettings/list.js'
import { GetResolvedBuildSettingCommand } from './commands/workspaceDocuments/projects/targets/buildConfigurations/resolvedBuildSettings/get.js'
import { ListSchemesCommand } from './commands/workspaceDocuments/schemes/list.js'
import { GetSchemeCommand } from './commands/workspaceDocuments/schemes/get.js'
import { ListRunDestinationsCommand } from './commands/workspaceDocuments/runDestinations/list.js'
import { GetRunDestinationCommand } from './commands/workspaceDocuments/runDestinations/get.js'
import { ListFileDocumentsCommand } from './commands/fileDocuments/list.js'
import { GetFileDocumentCommand } from './commands/fileDocuments/get.js'
import { ListSourceDocumentsCommand } from './commands/sourceDocuments/list.js'
import { GetSourceDocumentCommand } from './commands/sourceDocuments/get.js'
import { ListTextDocumentsCommand } from './commands/textDocuments/list.js'
import { GetTextDocumentCommand } from './commands/textDocuments/get.js'

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
    ListTargetsCommand,
    GetTargetCommand,
    ListBuildConfigurationsCommand,
    GetBuildConfigurationCommand,
    ListBuildSettingsCommand,
    GetBuildSettingCommand,
    ListResolvedBuildSettingsCommand,
    GetResolvedBuildSettingCommand,
    ListSchemesCommand,
    GetSchemeCommand,
    ListRunDestinationsCommand,
    GetRunDestinationCommand,
    ListFileDocumentsCommand,
    GetFileDocumentCommand,
    ListSourceDocumentsCommand,
    GetSourceDocumentCommand,
    ListTextDocumentsCommand,
    GetTextDocumentCommand,
  ],
}
