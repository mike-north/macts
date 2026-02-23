/**
 * All MCP tools for omnigraffle.
 *
 * @packageDocumentation
 */

import { canvasesListTool } from './canvases.js';
import { canvasesGetTool } from './canvases.js';
import { canvasesCreateTool } from './canvases.js';
import { graphicsListTool } from './graphics.js';
import { graphicsGetTool } from './graphics.js';
import { shapesListTool } from './shapes.js';
import { shapesGetTool } from './shapes.js';
import { shapesCreateTool } from './shapes.js';
import { linesListTool } from './lines.js';
import { linesGetTool } from './lines.js';
import { layersListTool } from './layers.js';
import { layersGetTool } from './layers.js';
import { layersCreateTool } from './layers.js';
import { appConnectTool } from './app.js';
import { appLayoutTool } from './app.js';
import { appExportTool } from './app.js';
import { appFlipTool } from './app.js';
import { appSlideTool } from './app.js';
import { appAssembleTool } from './app.js';
import { appPageAdjustTool } from './app.js';
import { appEvaluateJavascriptTool } from './app.js';

/**
 * All MCP tools.
 */
export const allTools = [
  canvasesListTool,
  canvasesGetTool,
  canvasesCreateTool,
  graphicsListTool,
  graphicsGetTool,
  shapesListTool,
  shapesGetTool,
  shapesCreateTool,
  linesListTool,
  linesGetTool,
  layersListTool,
  layersGetTool,
  layersCreateTool,
  appConnectTool,
  appLayoutTool,
  appExportTool,
  appFlipTool,
  appSlideTool,
  appAssembleTool,
  appPageAdjustTool,
  appEvaluateJavascriptTool,
] as const;
