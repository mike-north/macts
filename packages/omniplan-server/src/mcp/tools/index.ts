/**
 * All MCP tools for omniplan.
 *
 * @packageDocumentation
 */

import { projectsListTool } from './projects.js';
import { projectsGetTool } from './projects.js';
import { tasksListTool } from './tasks.js';
import { tasksGetTool } from './tasks.js';
import { tasksCreateTool } from './tasks.js';
import { milestonesListTool } from './milestones.js';
import { milestonesGetTool } from './milestones.js';
import { milestonesCreateTool } from './milestones.js';
import { resourcesListTool } from './resources.js';
import { resourcesGetTool } from './resources.js';
import { resourcesCreateTool } from './resources.js';
import { assignmentsListTool } from './assignments.js';
import { dependenciesListTool } from './dependencies.js';
import { violationsListTool } from './violations.js';
import { violationsFixTool } from './violations.js';
import { scenariosListTool } from './scenarios.js';
import { scenariosGetTool } from './scenarios.js';
import { appExportTool } from './app.js';
import { appAssignTool } from './app.js';
import { appDependTool } from './app.js';
import { appBaselineTool } from './app.js';
import { appLevelTool } from './app.js';
import { appLookupTool } from './app.js';
import { appChangeMarkTool } from './app.js';
import { appAddWorkTimeTool } from './app.js';
import { appSubtractWorkTimeTool } from './app.js';
import { appUndoTool } from './app.js';
import { appRedoTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  projectsListTool,
  projectsGetTool,
  tasksListTool,
  tasksGetTool,
  tasksCreateTool,
  milestonesListTool,
  milestonesGetTool,
  milestonesCreateTool,
  resourcesListTool,
  resourcesGetTool,
  resourcesCreateTool,
  assignmentsListTool,
  dependenciesListTool,
  violationsListTool,
  violationsFixTool,
  scenariosListTool,
  scenariosGetTool,
  appExportTool,
  appAssignTool,
  appDependTool,
  appBaselineTool,
  appLevelTool,
  appLookupTool,
  appChangeMarkTool,
  appAddWorkTimeTool,
  appSubtractWorkTimeTool,
  appUndoTool,
  appRedoTool,
] as const;
