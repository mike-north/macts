/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Horizontal alignment options */
export type HorizontalAlignment = 'left' | 'center' | 'right'

/** Vertical alignment options */
export type VerticalAlignment = 'top' | 'center' | 'bottom'

/** Hierarchical layout direction */
export type LayoutDirection = 'topToBottom' | 'leftToRight' | 'bottomToTop' | 'rightToLeft'

/** Type of automatic layout */
export type LayoutType = 'hierarchical' | 'forceDirected' | 'radial' | 'circular'

/** Type of cap at ends of the stroke */
export type StrokeCap = 'butt' | 'round' | 'square'

/** Type of join between segments of the stroke */
export type StrokeJoin = 'miter' | 'round' | 'bevel'

/** Type of fill for shapes */
export type FillType = 'noFill' | 'solidFill' | 'linearFill' | 'radialFill'

/** How to size and display image fills */
export type ImageSizing = 'manual' | 'stretched' | 'tiled'

/** Type of line */
export type LineType = 'straight' | 'curved' | 'orthogonal' | 'bezier'

/** Behavior when one line crosses another */
export type HopType =
  | 'noHop'
  | 'roundHop'
  | 'squareHop'
  | 'twoSideHop'
  | 'threeSideHop'
  | 'ignoreHop'
  | 'gapHop'
  | 'bridgeHop'

/** Rotation type for labels on lines */
export type LabelOrientation = 'horizontal' | 'vertical' | 'parallel' | 'perpendicular' | 'custom'

/** Autosizing behavior for text in shapes */
export type TextAutosizing = 'overflow' | 'full' | 'verticallyOnly' | 'clip'

/** Flip orientation */
export type Orientation = 'horizontally' | 'vertically'

/** The type of area to be exported */
export type ExportAreaType = 'selectedGraphics' | 'allGraphics' | 'currentCanvas' | 'entireDocument'

/** A drawing page/canvas in OmniGraffle */
export interface Canvas {
  /** Unique identifier */
  id: string
  /** Name of this canvas */
  name: string
  /** Adjust number of pages on the canvas automatically? */
  adjustsPages: boolean
  /** Whether canvas size is reported as multiples of page size */
  canvasSizeIsMeasuredInPages: boolean
  /** Size of the canvas (page size multiplied by number of pages) */
  canvasSize: { x: number; y: number }
  /** Size of each page */
  pageSize: { x: number; y: number }
  /** Horizontal pages */
  horizontalPages: number
  /** Vertical pages */
  verticalPages: number
  /** Column alignment */
  columnAlignment: HorizontalAlignment
  /** Row alignment */
  rowAlignment: VerticalAlignment
  /** Spacing between graphics in a column */
  columnSpacing: number
  /** Spacing between graphics in a row */
  rowSpacing: number
}

/** Input for creating a Canvas */
export interface CanvasCreateInput {
  /** Unique identifier */
  id?: string
  /** Name of this canvas */
  name?: string
  /** Adjust number of pages on the canvas automatically? */
  adjustsPages?: boolean
  /** Whether canvas size is reported as multiples of page size */
  canvasSizeIsMeasuredInPages?: boolean
  /** Size of the canvas (page size multiplied by number of pages) */
  canvasSize?: { x: number; y: number }
  /** Horizontal pages */
  horizontalPages?: number
  /** Vertical pages */
  verticalPages?: number
  /** Column alignment */
  columnAlignment?: HorizontalAlignment
  /** Row alignment */
  rowAlignment?: VerticalAlignment
  /** Spacing between graphics in a column */
  columnSpacing?: number
  /** Spacing between graphics in a row */
  rowSpacing?: number
}

/** Input for updating a Canvas */
export type CanvasUpdateInput = Partial<CanvasCreateInput>

/** Base class for visual elements in OmniGraffle */
export interface Graphic {
  /** Unique identifier */
  id: string
  /** Origin of the graphic (position of the upper-left corner of the bounding rectangle) */
  origin: { x: number; y: number }
  /** Size of the graphic (width and height of the bounding rectangle) */
  size: { x: number; y: number }
  /** Is this graphic locked? */
  locked: boolean
  /** Does this graphic allow connections to it? */
  allowsConnections: boolean
  /** When snapped to the grid does this graphic align its edges to the grid? */
  alignsEdgesToGrid: boolean
  /** Curvature of corners in the stroke path */
  cornerRadius: number
  /** Does this graphic draw its shadow? */
  drawsShadow: boolean
  /** Does this graphic draw its stroke? */
  drawsStroke: boolean
  /** Does this graphic have a double-lined stroke? */
  doubleStroke: boolean
  /** Is this graphic flipped horizontally? */
  flippedHorizontally: boolean
  /** Is this graphic flipped vertically? */
  flippedVertically: boolean
  /** Color of the shadow */
  shadowColor: { r: number; g: number; b: number }
  /** The 'fuzziness' of the graphic's shadow */
  shadowFuzziness: number
  /** The direction of the graphic's shadow */
  shadowVector: { x: number; y: number }
  /** Does this graphic draw its shadow immediately beneath itself? */
  shadowBeneath: boolean
  /** Color of the stroke */
  strokeColor: { r: number; g: number; b: number }
  /** Type of cap at ends of the stroke */
  strokeCap: StrokeCap
  /** Type of join between segments of the stroke */
  strokeJoin: StrokeJoin
  /** Dash pattern of the stroke */
  strokePattern: number
  /** Thickness of the stroke */
  thickness: number
  /** Notes for this graphic */
  notes: string
  /** Name of a graphic */
  userName: string
  /** Arbitrary string tag attached to this graphic */
  tag: string
  /** Web link for this graphic */
  url: string
  /** Source of attached AppleScript */
  script: string
  /** Rank group assigned to this graphic for hierarchical layout */
  rankGroup: number
}

/** Input for creating a Graphic */
export interface GraphicCreateInput {
  /** Origin of the graphic (position of the upper-left corner of the bounding rectangle) */
  origin?: { x: number; y: number }
  /** Size of the graphic (width and height of the bounding rectangle) */
  size?: { x: number; y: number }
  /** Is this graphic locked? */
  locked?: boolean
  /** Does this graphic allow connections to it? */
  allowsConnections?: boolean
  /** When snapped to the grid does this graphic align its edges to the grid? */
  alignsEdgesToGrid?: boolean
  /** Curvature of corners in the stroke path */
  cornerRadius?: number
  /** Does this graphic draw its shadow? */
  drawsShadow?: boolean
  /** Does this graphic draw its stroke? */
  drawsStroke?: boolean
  /** Does this graphic have a double-lined stroke? */
  doubleStroke?: boolean
  /** Is this graphic flipped horizontally? */
  flippedHorizontally?: boolean
  /** Is this graphic flipped vertically? */
  flippedVertically?: boolean
  /** Color of the shadow */
  shadowColor?: { r: number; g: number; b: number }
  /** The 'fuzziness' of the graphic's shadow */
  shadowFuzziness?: number
  /** The direction of the graphic's shadow */
  shadowVector?: { x: number; y: number }
  /** Does this graphic draw its shadow immediately beneath itself? */
  shadowBeneath?: boolean
  /** Color of the stroke */
  strokeColor?: { r: number; g: number; b: number }
  /** Type of cap at ends of the stroke */
  strokeCap?: StrokeCap
  /** Type of join between segments of the stroke */
  strokeJoin?: StrokeJoin
  /** Dash pattern of the stroke */
  strokePattern?: number
  /** Thickness of the stroke */
  thickness?: number
  /** Notes for this graphic */
  notes?: string
  /** Name of a graphic */
  userName?: string
  /** Arbitrary string tag attached to this graphic */
  tag?: string
  /** Web link for this graphic */
  url?: string
  /** Source of attached AppleScript */
  script?: string
  /** Rank group assigned to this graphic for hierarchical layout */
  rankGroup?: number
}

/** Input for updating a Graphic */
export type GraphicUpdateInput = Partial<GraphicCreateInput>

/** A shape graphic in OmniGraffle */
export interface Shape {
  /** Unique identifier */
  id: string
  /** Name of the shape */
  name: string
  /** The text inside the shape */
  text: string
  /** The type of fill for this shape */
  fill: FillType
  /** The fill color */
  fillColor: { r: number; g: number; b: number }
  /** For linear and radial fills, this is the ending color */
  gradientColor: { r: number; g: number; b: number }
  /** Angle of a linear gradient fill */
  gradientAngle: number
  /** Rotation of the graphic in degrees */
  rotation: number
  /** Placement of the text inside the shape */
  textPlacement: VerticalAlignment
  /** Autosizing behavior of the shape around the text */
  autosizing: TextAutosizing
  /** Padding at the left and right of the text space */
  sidePadding: number
  /** Padding at the top and bottom of the text space */
  verticalPadding: number
}

/** Input for creating a Shape */
export interface ShapeCreateInput {
  /** Name of the shape */
  name?: string
  /** The text inside the shape */
  text?: string
  /** The type of fill for this shape */
  fill?: FillType
  /** The fill color */
  fillColor?: { r: number; g: number; b: number }
  /** For linear and radial fills, this is the ending color */
  gradientColor?: { r: number; g: number; b: number }
  /** Angle of a linear gradient fill */
  gradientAngle?: number
  /** Rotation of the graphic in degrees */
  rotation?: number
  /** Placement of the text inside the shape */
  textPlacement?: VerticalAlignment
  /** Autosizing behavior of the shape around the text */
  autosizing?: TextAutosizing
  /** Padding at the left and right of the text space */
  sidePadding?: number
  /** Padding at the top and bottom of the text space */
  verticalPadding?: number
}

/** Input for updating a Shape */
export type ShapeUpdateInput = Partial<ShapeCreateInput>

/** A line/connector in OmniGraffle */
export interface Line {
  /** Unique identifier */
  id: string
  /** Type of the line */
  lineType: LineType
  /** The behavior when one line crosses over another line */
  hopType: HopType
  /** Type of line ending on the head of the line */
  headType: string
  /** Type of line ending on the tail of the line */
  tailType: string
  /** Scale of line ending on the head of the line */
  headScale: number
  /** Scale of line ending on the tail of the line */
  tailScale: number
  /** Which magnet of the destination graphic the line attaches to */
  headMagnet: number
  /** Which magnet of the source graphic the line attaches to */
  tailMagnet: number
}

/** Input for creating a Line */
export interface LineCreateInput {
  /** Type of the line */
  lineType?: LineType
  /** The behavior when one line crosses over another line */
  hopType?: HopType
  /** Type of line ending on the head of the line */
  headType?: string
  /** Type of line ending on the tail of the line */
  tailType?: string
  /** Scale of line ending on the head of the line */
  headScale?: number
  /** Scale of line ending on the tail of the line */
  tailScale?: number
  /** Which magnet of the destination graphic the line attaches to */
  headMagnet?: number
  /** Which magnet of the source graphic the line attaches to */
  tailMagnet?: number
}

/** Input for updating a Line */
export type LineUpdateInput = Partial<LineCreateInput>

/** A group of graphics in OmniGraffle */
export interface Group {
  /** Unique identifier */
  id: string
  /** Rotation of the group in degrees */
  rotation: number
  /** Only connect to the group? */
  connectToGroupOnly: boolean
}

/** Input for creating a Group */
export interface GroupCreateInput {
  /** Rotation of the group in degrees */
  rotation?: number
  /** Only connect to the group? */
  connectToGroupOnly?: boolean
}

/** Input for updating a Group */
export type GroupUpdateInput = Partial<GroupCreateInput>

/** A drawing layer in OmniGraffle */
export interface Layer {
  /** Name of the layer */
  name: string
  /** Are the layer's graphics locked? */
  locked: boolean
  /** Are the layer's graphics visible? */
  visible: boolean
  /** Do the layer's graphics print? */
  prints: boolean
}

/** Input for creating a Layer */
export interface LayerCreateInput {
  /** Name of the layer */
  name?: string
  /** Are the layer's graphics locked? */
  locked?: boolean
  /** Are the layer's graphics visible? */
  visible?: boolean
  /** Do the layer's graphics print? */
  prints?: boolean
}

/** Input for updating a Layer */
export type LayerUpdateInput = Partial<LayerCreateInput>

/** A subgraph container in OmniGraffle */
export interface Subgraph {
  /** Unique identifier */
  id: string
  /** Is the subgraph collapsed? */
  collapsed: boolean
  /** Top margin */
  topMargin: number
  /** Bottom margin */
  bottomMargin: number
  /** Left margin */
  leftMargin: number
  /** Right margin */
  rightMargin: number
}

/** Input for creating a Subgraph */
export interface SubgraphCreateInput {
  /** Is the subgraph collapsed? */
  collapsed?: boolean
  /** Top margin */
  topMargin?: number
  /** Bottom margin */
  bottomMargin?: number
  /** Left margin */
  leftMargin?: number
  /** Right margin */
  rightMargin?: number
}

/** Input for updating a Subgraph */
export type SubgraphUpdateInput = Partial<SubgraphCreateInput>

/** A text label on a line */
export interface Label {
  /** Unique identifier */
  id: string
  /** The text inside the label */
  text: string
  /** The position along the line */
  labelPosition: number
  /** The offset from the line */
  labelOffset: number
  /** The type of rotation around the line */
  labelRotation: LabelOrientation
}

/** Input for creating a Label */
export interface LabelCreateInput {
  /** The text inside the label */
  text?: string
  /** The position along the line */
  labelPosition?: number
  /** The offset from the line */
  labelOffset?: number
  /** The type of rotation around the line */
  labelRotation?: LabelOrientation
}

/** Input for updating a Label */
export type LabelUpdateInput = Partial<LabelCreateInput>

/** Grid settings for a canvas */
export interface Grid {
  /** Is the grid visible? */
  visible: boolean
  /** Do points snap to the grid? */
  snaps: boolean
  /** Number of pixels between minor grid lines */
  spacing: number
  /** Does the grid have 'major' lines? */
  major: boolean
  /** The number of minor grid lines for each major line */
  majorSpacing: number
  /** Does the grid draw in front of all shapes? */
  drawsInFront: boolean
  /** Color of the grid */
  scriptGridColor: { r: number; g: number; b: number }
  /** Color of major lines */
  scriptMajorGridColor: { r: number; g: number; b: number }
}

/** Input for creating a Grid */
export interface GridCreateInput {
  /** Is the grid visible? */
  visible?: boolean
  /** Do points snap to the grid? */
  snaps?: boolean
  /** Number of pixels between minor grid lines */
  spacing?: number
  /** Does the grid have 'major' lines? */
  major?: boolean
  /** The number of minor grid lines for each major line */
  majorSpacing?: number
  /** Does the grid draw in front of all shapes? */
  drawsInFront?: boolean
  /** Color of the grid */
  scriptGridColor?: { r: number; g: number; b: number }
  /** Color of major lines */
  scriptMajorGridColor?: { r: number; g: number; b: number }
}

/** Input for updating a Grid */
export type GridUpdateInput = Partial<GridCreateInput>

/** A reusable template/master in OmniGraffle */
export interface Master {
  /** Unique identifier */
  id: string
  /** Name of this master */
  name: string
}

/** Input for creating a Master */
export interface MasterCreateInput {
  /** Unique identifier */
  id?: string
  /** Name of this master */
  name?: string
}

/** Input for updating a Master */
export type MasterUpdateInput = Partial<MasterCreateInput>

/** Export configuration settings */
export interface ExportSettings {
  /** The type of area to be exported */
  areaType: ExportAreaType
  /** The scale to use during export */
  exportScale: number
  /** The number of pixels per point in the resulting exported image */
  resolution: number
  /** Draw the background canvas color */
  drawsBackground: boolean
  /** Whether or not to include a border area */
  includeBorder: boolean
  /** The number of pixels of border area to include */
  borderAmount: number
  /** Whether to export with non printing layers */
  includeNonprintingLayers: boolean
  /** Whether to export with artboards */
  useArtboards: boolean
}

/** Input for creating a ExportSettings */
export interface ExportSettingsCreateInput {
  /** The type of area to be exported */
  areaType?: ExportAreaType
  /** The scale to use during export */
  exportScale?: number
  /** The number of pixels per point in the resulting exported image */
  resolution?: number
  /** Draw the background canvas color */
  drawsBackground?: boolean
  /** Whether or not to include a border area */
  includeBorder?: boolean
  /** The number of pixels of border area to include */
  borderAmount?: number
  /** Whether to export with non printing layers */
  includeNonprintingLayers?: boolean
  /** Whether to export with artboards */
  useArtboards?: boolean
}

/** Input for updating a ExportSettings */
export type ExportSettingsUpdateInput = Partial<ExportSettingsCreateInput>

// Zod schemas for runtime validation

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

export const GroupSchema = z.object({
  id: z.string(),
  rotation: z.number(),
  connectToGroupOnly: z.boolean(),
})

export const LayerSchema = z.object({
  name: z.string(),
  locked: z.boolean(),
  visible: z.boolean(),
  prints: z.boolean(),
})

export const SubgraphSchema = z.object({
  id: z.string(),
  collapsed: z.boolean(),
  topMargin: z.number(),
  bottomMargin: z.number(),
  leftMargin: z.number(),
  rightMargin: z.number(),
})

export const LabelSchema = z.object({
  id: z.string(),
  text: z.string(),
  labelPosition: z.number(),
  labelOffset: z.number(),
  labelRotation: z.string(),
})

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

export const MasterSchema = z.object({
  id: z.string(),
  name: z.string(),
})

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
