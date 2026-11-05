/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { HorizontalAlignment } from './contract/index.js'

export type { VerticalAlignment } from './contract/index.js'

export type { LayoutDirection } from './contract/index.js'

export type { LayoutType } from './contract/index.js'

export type { StrokeCap } from './contract/index.js'

export type { StrokeJoin } from './contract/index.js'

export type { FillType } from './contract/index.js'

export type { ImageSizing } from './contract/index.js'

export type { LineType } from './contract/index.js'

export type { HopType } from './contract/index.js'

export type { LabelOrientation } from './contract/index.js'

export type { TextAutosizing } from './contract/index.js'

export type { Orientation } from './contract/index.js'

export type { ExportAreaType } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Canvas } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type CanvasCreateInput = Omit<
  import('./contract/index.js').CanvasCreateInput,
  'horizontalPages' | 'verticalPages'
> & {
  /** Horizontal pages Numeric values are validated by the contract before dispatch. */
  horizontalPages?: null extends import('./contract/index.js').CanvasCreateInput['horizontalPages']
    ? number | null
    : number
  /** Vertical pages Numeric values are validated by the contract before dispatch. */
  verticalPages?: null extends import('./contract/index.js').CanvasCreateInput['verticalPages']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type CanvasUpdateInput = Omit<
  import('./contract/index.js').CanvasUpdateInput,
  'horizontalPages' | 'verticalPages'
> & {
  /** Horizontal pages Numeric values are validated by the contract before dispatch. */
  horizontalPages?: null extends import('./contract/index.js').CanvasUpdateInput['horizontalPages']
    ? number | null
    : number
  /** Vertical pages Numeric values are validated by the contract before dispatch. */
  verticalPages?: null extends import('./contract/index.js').CanvasUpdateInput['verticalPages']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Graphic } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type GraphicCreateInput = Omit<
  import('./contract/index.js').GraphicCreateInput,
  'strokePattern' | 'rankGroup'
> & {
  /** Dash pattern of the stroke Numeric values are validated by the contract before dispatch. */
  strokePattern?: null extends import('./contract/index.js').GraphicCreateInput['strokePattern']
    ? number | null
    : number
  /** Rank group assigned to this graphic for hierarchical layout Numeric values are validated by the contract before dispatch. */
  rankGroup?: null extends import('./contract/index.js').GraphicCreateInput['rankGroup']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type GraphicUpdateInput = Omit<
  import('./contract/index.js').GraphicUpdateInput,
  'strokePattern' | 'rankGroup'
> & {
  /** Dash pattern of the stroke Numeric values are validated by the contract before dispatch. */
  strokePattern?: null extends import('./contract/index.js').GraphicUpdateInput['strokePattern']
    ? number | null
    : number
  /** Rank group assigned to this graphic for hierarchical layout Numeric values are validated by the contract before dispatch. */
  rankGroup?: null extends import('./contract/index.js').GraphicUpdateInput['rankGroup']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Shape } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ShapeCreateInput = Omit<
  import('./contract/index.js').ShapeCreateInput,
  'sidePadding' | 'verticalPadding' | 'canvasId'
> & {
  /** Padding at the left and right of the text space Numeric values are validated by the contract before dispatch. */
  sidePadding?: null extends import('./contract/index.js').ShapeCreateInput['sidePadding']
    ? number | null
    : number
  /** Padding at the top and bottom of the text space Numeric values are validated by the contract before dispatch. */
  verticalPadding?: null extends import('./contract/index.js').ShapeCreateInput['verticalPadding']
    ? number | null
    : number
  /** Canvas identifier for the shape Numeric values are validated by the contract before dispatch. */
  canvasId: null extends import('./contract/index.js').ShapeCreateInput['canvasId']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type ShapeUpdateInput = Omit<
  import('./contract/index.js').ShapeUpdateInput,
  'sidePadding' | 'verticalPadding' | 'canvasId'
> & {
  /** Padding at the left and right of the text space Numeric values are validated by the contract before dispatch. */
  sidePadding?: null extends import('./contract/index.js').ShapeUpdateInput['sidePadding']
    ? number | null
    : number
  /** Padding at the top and bottom of the text space Numeric values are validated by the contract before dispatch. */
  verticalPadding?: null extends import('./contract/index.js').ShapeUpdateInput['verticalPadding']
    ? number | null
    : number
  /** Canvas identifier for the shape Numeric values are validated by the contract before dispatch. */
  canvasId?: null extends import('./contract/index.js').ShapeUpdateInput['canvasId']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Line } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type LineCreateInput = Omit<
  import('./contract/index.js').LineCreateInput,
  'headMagnet' | 'tailMagnet'
> & {
  /** Which magnet of the destination graphic the line attaches to Numeric values are validated by the contract before dispatch. */
  headMagnet?: null extends import('./contract/index.js').LineCreateInput['headMagnet']
    ? number | null
    : number
  /** Which magnet of the source graphic the line attaches to Numeric values are validated by the contract before dispatch. */
  tailMagnet?: null extends import('./contract/index.js').LineCreateInput['tailMagnet']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type LineUpdateInput = Omit<
  import('./contract/index.js').LineUpdateInput,
  'headMagnet' | 'tailMagnet'
> & {
  /** Which magnet of the destination graphic the line attaches to Numeric values are validated by the contract before dispatch. */
  headMagnet?: null extends import('./contract/index.js').LineUpdateInput['headMagnet']
    ? number | null
    : number
  /** Which magnet of the source graphic the line attaches to Numeric values are validated by the contract before dispatch. */
  tailMagnet?: null extends import('./contract/index.js').LineUpdateInput['tailMagnet']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Group } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { GroupCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { GroupUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Layer } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { LayerCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { LayerUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Subgraph } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SubgraphCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SubgraphUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Label } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { LabelCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { LabelUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Grid } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type GridCreateInput = Omit<
  import('./contract/index.js').GridCreateInput,
  'majorSpacing'
> & {
  /** The number of minor grid lines for each major line Numeric values are validated by the contract before dispatch. */
  majorSpacing?: null extends import('./contract/index.js').GridCreateInput['majorSpacing']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type GridUpdateInput = Omit<
  import('./contract/index.js').GridUpdateInput,
  'majorSpacing'
> & {
  /** The number of minor grid lines for each major line Numeric values are validated by the contract before dispatch. */
  majorSpacing?: null extends import('./contract/index.js').GridUpdateInput['majorSpacing']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Master } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MasterCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MasterUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ExportSettings } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ExportSettingsCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ExportSettingsUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const CanvasSchema = z.object({
  id: z.string(),
  name: z.string(),
  adjustsPages: z.boolean(),
  canvasSizeIsMeasuredInPages: z.boolean(),
  canvasSize: z.object({ x: z.number(), y: z.number() }),
  pageSize: z.object({ x: z.number(), y: z.number() }),
  horizontalPages: z.number(),
  verticalPages: z.number(),
  columnAlignment: z.string(),
  rowAlignment: z.string(),
  columnSpacing: z.number(),
  rowSpacing: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const GraphicSchema = z.object({
  id: z.string(),
  origin: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ x: z.number(), y: z.number() }),
  locked: z.boolean(),
  allowsConnections: z.boolean(),
  alignsEdgesToGrid: z.boolean(),
  cornerRadius: z.number(),
  drawsShadow: z.boolean(),
  drawsStroke: z.boolean(),
  doubleStroke: z.boolean(),
  flippedHorizontally: z.boolean(),
  flippedVertically: z.boolean(),
  shadowColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  shadowFuzziness: z.number(),
  shadowVector: z.object({ x: z.number(), y: z.number() }),
  shadowBeneath: z.boolean(),
  strokeColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  strokeCap: z.string(),
  strokeJoin: z.string(),
  strokePattern: z.number(),
  thickness: z.number(),
  notes: z.string(),
  userName: z.string(),
  tag: z.string(),
  url: z.string(),
  script: z.string(),
  rankGroup: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ShapeSchema = z.object({
  id: z.string(),
  name: z.string(),
  text: z.string(),
  fill: z.string(),
  fillColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  gradientColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  gradientAngle: z.number(),
  rotation: z.number(),
  textPlacement: z.string(),
  autosizing: z.string(),
  sidePadding: z.number(),
  verticalPadding: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const LineSchema = z.object({
  id: z.string(),
  lineType: z.string(),
  hopType: z.string(),
  headType: z.string(),
  tailType: z.string(),
  headScale: z.number(),
  tailScale: z.number(),
  headMagnet: z.number(),
  tailMagnet: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const GroupSchema = z.object({
  id: z.string(),
  rotation: z.number(),
  connectToGroupOnly: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const LayerSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  locked: z.boolean(),
  visible: z.boolean(),
  prints: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SubgraphSchema = z.object({
  id: z.string(),
  collapsed: z.boolean(),
  topMargin: z.number(),
  bottomMargin: z.number(),
  leftMargin: z.number(),
  rightMargin: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const LabelSchema = z.object({
  id: z.string(),
  text: z.string(),
  labelPosition: z.number(),
  labelOffset: z.number(),
  labelRotation: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const GridSchema = z.object({
  visible: z.boolean(),
  snaps: z.boolean(),
  spacing: z.number(),
  major: z.boolean(),
  majorSpacing: z.number(),
  drawsInFront: z.boolean(),
  scriptGridColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  scriptMajorGridColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MasterSchema = z.object({
  id: z.string(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ExportSettingsSchema = z.object({
  areaType: z.string(),
  exportScale: z.number(),
  resolution: z.number(),
  drawsBackground: z.boolean(),
  includeBorder: z.boolean(),
  borderAmount: z.number(),
  includeNonprintingLayers: z.boolean(),
  useArtboards: z.boolean(),
})
