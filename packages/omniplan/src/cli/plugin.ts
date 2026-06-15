import type { CliPlugin } from '@macts/cli'
import { ListProjectsCommand } from './commands/projects/list.js'
import { GetProjectCommand } from './commands/projects/get.js'
import { ListScenariosCommand } from './commands/projects/scenarios/list.js'
import { GetScenarioCommand } from './commands/projects/scenarios/get.js'
import { ListTasksCommand } from './commands/projects/scenarios/tasks/list.js'
import { CreateTaskCommand } from './commands/projects/scenarios/tasks/create.js'
import { GetTaskCommand } from './commands/projects/scenarios/tasks/get.js'
import { ListMilestonesCommand } from './commands/projects/scenarios/milestones/list.js'
import { CreateMilestoneCommand } from './commands/projects/scenarios/milestones/create.js'
import { GetMilestoneCommand } from './commands/projects/scenarios/milestones/get.js'
import { ListResourcesCommand } from './commands/projects/scenarios/resources/list.js'
import { CreateResourceCommand } from './commands/projects/scenarios/resources/create.js'
import { GetResourceCommand } from './commands/projects/scenarios/resources/get.js'
import { ListViolationsCommand } from './commands/projects/scenarios/violations/list.js'
import { FixViolationCommand } from './commands/projects/scenarios/violations/fix.js'
import { ListAssignmentsCommand } from './commands/projects/tasks/assignments/list.js'
import { ListDependenciesCommand } from './commands/projects/tasks/dependencies/list.js'
import { ExportCommand } from './commands/export.js'
import { AssignCommand } from './commands/assign.js'
import { DependCommand } from './commands/depend.js'
import { BaselineCommand } from './commands/baseline.js'
import { LevelCommand } from './commands/level.js'
import { LookupCommand } from './commands/lookup.js'
import { ChangeMarkCommand } from './commands/change-mark.js'
import { AddWorkTimeCommand } from './commands/add-work-time.js'
import { SubtractWorkTimeCommand } from './commands/subtract-work-time.js'
import { UndoCommand } from './commands/undo.js'
import { RedoCommand } from './commands/redo.js'

/**
 * CLI plugin for OmniPlan.
 */
export const plugin: CliPlugin = {
  name: 'omniplan',
  description: 'Commands for OmniPlan',
  commands: [
    ListProjectsCommand,
    GetProjectCommand,
    ListScenariosCommand,
    GetScenarioCommand,
    ListTasksCommand,
    CreateTaskCommand,
    GetTaskCommand,
    ListMilestonesCommand,
    CreateMilestoneCommand,
    GetMilestoneCommand,
    ListResourcesCommand,
    CreateResourceCommand,
    GetResourceCommand,
    ListViolationsCommand,
    FixViolationCommand,
    ListAssignmentsCommand,
    ListDependenciesCommand,
    ExportCommand,
    AssignCommand,
    DependCommand,
    BaselineCommand,
    LevelCommand,
    LookupCommand,
    ChangeMarkCommand,
    AddWorkTimeCommand,
    SubtractWorkTimeCommand,
    UndoCommand,
    RedoCommand,
  ],
}
