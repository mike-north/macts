import type { CliPlugin } from '@macts/cli'
import { ListCanvasesCommand } from './commands/canvases/list.js'
import { CreateCanvasCommand } from './commands/canvases/create.js'
import { GetCanvasCommand } from './commands/canvases/get.js'
import { ListGraphicsCommand } from './commands/canvases/graphics/list.js'
import { CreateGraphicCommand } from './commands/canvases/graphics/create.js'
import { GetGraphicCommand } from './commands/canvases/graphics/get.js'
import { ListShapesCommand } from './commands/canvases/shapes/list.js'
import { CreateShapeCommand } from './commands/canvases/shapes/create.js'
import { GetShapeCommand } from './commands/canvases/shapes/get.js'
import { ListLinesCommand } from './commands/canvases/lines/list.js'
import { CreateLineCommand } from './commands/canvases/lines/create.js'
import { GetLineCommand } from './commands/canvases/lines/get.js'
import { ListGroupsCommand } from './commands/canvases/groups/list.js'
import { CreateGroupCommand } from './commands/canvases/groups/create.js'
import { GetGroupCommand } from './commands/canvases/groups/get.js'
import { ListLayersCommand } from './commands/canvases/layers/list.js'
import { CreateLayerCommand } from './commands/canvases/layers/create.js'
import { GetLayerCommand } from './commands/canvases/layers/get.js'
import { ListSubgraphsCommand } from './commands/canvases/subgraphs/list.js'
import { CreateSubgraphCommand } from './commands/canvases/subgraphs/create.js'
import { GetSubgraphCommand } from './commands/canvases/subgraphs/get.js'
import { ListMastersCommand } from './commands/masters/list.js'
import { CreateMasterCommand } from './commands/masters/create.js'
import { GetMasterCommand } from './commands/masters/get.js'
import { ConnectCommand } from './commands/connect.js'
import { LayoutCommand } from './commands/layout.js'
import { ExportCommand } from './commands/export.js'
import { FlipCommand } from './commands/flip.js'
import { SlideCommand } from './commands/slide.js'
import { AssembleCommand } from './commands/assemble.js'
import { PageAdjustCommand } from './commands/page-adjust.js'
import { EvaluateJavascriptCommand } from './commands/evaluate-javascript.js'

/**
 * CLI plugin for OmniGraffle.
 */
export const plugin: CliPlugin = {
  name: 'omnigraffle',
  description: 'Commands for OmniGraffle',
  commands: [
    ListCanvasesCommand,
    CreateCanvasCommand,
    GetCanvasCommand,
    ListGraphicsCommand,
    CreateGraphicCommand,
    GetGraphicCommand,
    ListShapesCommand,
    CreateShapeCommand,
    GetShapeCommand,
    ListLinesCommand,
    CreateLineCommand,
    GetLineCommand,
    ListGroupsCommand,
    CreateGroupCommand,
    GetGroupCommand,
    ListLayersCommand,
    CreateLayerCommand,
    GetLayerCommand,
    ListSubgraphsCommand,
    CreateSubgraphCommand,
    GetSubgraphCommand,
    ListMastersCommand,
    CreateMasterCommand,
    GetMasterCommand,
    ConnectCommand,
    LayoutCommand,
    ExportCommand,
    FlipCommand,
    SlideCommand,
    AssembleCommand,
    PageAdjustCommand,
    EvaluateJavascriptCommand,
  ],
}
