/**
 * The OmniGraffle contract: the transport-neutral description of every
 * OmniGraffle operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `OmniGraffleClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `OmniGraffleClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the OmniGraffle manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type Integer,
  type OperationDescriptor,
  type Point,
  type Rgb,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

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
  canvasSize: Point
  /** Size of each page */
  readonly pageSize: Point
  /** Horizontal pages */
  horizontalPages: Integer
  /** Vertical pages */
  verticalPages: Integer
  /** Column alignment */
  columnAlignment: HorizontalAlignment
  /** Row alignment */
  rowAlignment: VerticalAlignment
  /** Spacing between graphics in a column */
  columnSpacing: number
  /** Spacing between graphics in a row */
  rowSpacing: number
}

/** Base class for visual elements in OmniGraffle */
export interface Graphic {
  /** Unique identifier */
  readonly id: string
  /** Origin of the graphic (position of the upper-left corner of the bounding rectangle) */
  origin: Point
  /** Size of the graphic (width and height of the bounding rectangle) */
  size: Point
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
  shadowColor: Rgb
  /** The 'fuzziness' of the graphic's shadow */
  shadowFuzziness: number
  /** The direction of the graphic's shadow */
  shadowVector: Point
  /** Does this graphic draw its shadow immediately beneath itself? */
  shadowBeneath: boolean
  /** Color of the stroke */
  strokeColor: Rgb
  /** Type of cap at ends of the stroke */
  strokeCap: StrokeCap
  /** Type of join between segments of the stroke */
  strokeJoin: StrokeJoin
  /** Dash pattern of the stroke */
  strokePattern: Integer
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
  rankGroup: Integer
}

/** A shape graphic in OmniGraffle */
export interface Shape {
  /** Unique identifier */
  readonly id: string
  /** Name of the shape */
  name: string
  /** The text inside the shape */
  text: string
  /** The type of fill for this shape */
  fill: FillType
  /** The fill color */
  fillColor: Rgb
  /** For linear and radial fills, this is the ending color */
  gradientColor: Rgb
  /** Angle of a linear gradient fill */
  gradientAngle: number
  /** Rotation of the graphic in degrees */
  rotation: number
  /** Placement of the text inside the shape */
  textPlacement: VerticalAlignment
  /** Autosizing behavior of the shape around the text */
  autosizing: TextAutosizing
  /** Padding at the left and right of the text space */
  sidePadding: Integer
  /** Padding at the top and bottom of the text space */
  verticalPadding: Integer
}

/** A line/connector in OmniGraffle */
export interface Line {
  /** Unique identifier */
  readonly id: string
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
  headMagnet: Integer
  /** Which magnet of the source graphic the line attaches to */
  tailMagnet: Integer
}

/** A group of graphics in OmniGraffle */
export interface Group {
  /** Unique identifier */
  readonly id: string
  /** Rotation of the group in degrees */
  rotation: number
  /** Only connect to the group? */
  connectToGroupOnly: boolean
}

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

/** A subgraph container in OmniGraffle */
export interface Subgraph {
  /** Unique identifier */
  readonly id: string
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

/** A text label on a line */
export interface Label {
  /** Unique identifier */
  readonly id: string
  /** The text inside the label */
  text: string
  /** The position along the line */
  labelPosition: number
  /** The offset from the line */
  labelOffset: number
  /** The type of rotation around the line */
  labelRotation: LabelOrientation
}

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
  majorSpacing: Integer
  /** Does the grid draw in front of all shapes? */
  drawsInFront: boolean
  /** Color of the grid */
  scriptGridColor: Rgb
  /** Color of major lines */
  scriptMajorGridColor: Rgb
}

/** A reusable template/master in OmniGraffle */
export interface Master {
  /** Unique identifier */
  id: string
  /** Name of this master */
  name: string
}

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

/** Input for creating a Canvas. */
export interface CanvasCreateInput {
  /** Unique identifier */
  id?: string
  /** Canvas name */
  name: string
  /** Adjust number of pages on the canvas automatically? */
  adjustsPages?: boolean
  /** Whether canvas size is reported as multiples of page size */
  canvasSizeIsMeasuredInPages?: boolean
  /** Size of the canvas (page size multiplied by number of pages) */
  canvasSize?: Point
  /** Horizontal pages */
  horizontalPages?: Integer
  /** Vertical pages */
  verticalPages?: Integer
  /** Column alignment */
  columnAlignment?: HorizontalAlignment
  /** Row alignment */
  rowAlignment?: VerticalAlignment
  /** Spacing between graphics in a column */
  columnSpacing?: number
  /** Spacing between graphics in a row */
  rowSpacing?: number
}

/** Input for updating a Canvas. Omitted fields are left unchanged. */
export interface CanvasUpdateInput {
  /** Unique identifier */
  id?: string
  /** Canvas name */
  name?: string
  /** Adjust number of pages on the canvas automatically? */
  adjustsPages?: boolean
  /** Whether canvas size is reported as multiples of page size */
  canvasSizeIsMeasuredInPages?: boolean
  /** Size of the canvas (page size multiplied by number of pages) */
  canvasSize?: Point
  /** Horizontal pages */
  horizontalPages?: Integer
  /** Vertical pages */
  verticalPages?: Integer
  /** Column alignment */
  columnAlignment?: HorizontalAlignment
  /** Row alignment */
  rowAlignment?: VerticalAlignment
  /** Spacing between graphics in a column */
  columnSpacing?: number
  /** Spacing between graphics in a row */
  rowSpacing?: number
}

/** Input for creating a Graphic. */
export interface GraphicCreateInput {
  /** Origin of the graphic (position of the upper-left corner of the bounding rectangle) */
  origin?: Point
  /** Size of the graphic (width and height of the bounding rectangle) */
  size?: Point
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
  shadowColor?: Rgb
  /** The 'fuzziness' of the graphic's shadow */
  shadowFuzziness?: number
  /** The direction of the graphic's shadow */
  shadowVector?: Point
  /** Does this graphic draw its shadow immediately beneath itself? */
  shadowBeneath?: boolean
  /** Color of the stroke */
  strokeColor?: Rgb
  /** Type of cap at ends of the stroke */
  strokeCap?: StrokeCap
  /** Type of join between segments of the stroke */
  strokeJoin?: StrokeJoin
  /** Dash pattern of the stroke */
  strokePattern?: Integer
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
  rankGroup?: Integer
}

/** Input for updating a Graphic. Omitted fields are left unchanged. */
export interface GraphicUpdateInput {
  /** Origin of the graphic (position of the upper-left corner of the bounding rectangle) */
  origin?: Point
  /** Size of the graphic (width and height of the bounding rectangle) */
  size?: Point
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
  shadowColor?: Rgb
  /** The 'fuzziness' of the graphic's shadow */
  shadowFuzziness?: number
  /** The direction of the graphic's shadow */
  shadowVector?: Point
  /** Does this graphic draw its shadow immediately beneath itself? */
  shadowBeneath?: boolean
  /** Color of the stroke */
  strokeColor?: Rgb
  /** Type of cap at ends of the stroke */
  strokeCap?: StrokeCap
  /** Type of join between segments of the stroke */
  strokeJoin?: StrokeJoin
  /** Dash pattern of the stroke */
  strokePattern?: Integer
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
  rankGroup?: Integer
}

/** Input for creating a Shape. */
export interface ShapeCreateInput {
  /** Name of the shape */
  name?: string
  /** Text content */
  text?: string
  /** The type of fill for this shape */
  fill?: FillType
  /** The fill color */
  fillColor?: Rgb
  /** For linear and radial fills, this is the ending color */
  gradientColor?: Rgb
  /** Angle of a linear gradient fill */
  gradientAngle?: number
  /** Rotation of the graphic in degrees */
  rotation?: number
  /** Placement of the text inside the shape */
  textPlacement?: VerticalAlignment
  /** Autosizing behavior of the shape around the text */
  autosizing?: TextAutosizing
  /** Padding at the left and right of the text space */
  sidePadding?: Integer
  /** Padding at the top and bottom of the text space */
  verticalPadding?: Integer
  /** Canvas identifier for the shape */
  canvasId: Integer
  /** Shape origin */
  origin: Point
  /** Shape size */
  size: Point
}

/** Input for updating a Shape. Omitted fields are left unchanged. */
export interface ShapeUpdateInput {
  /** Name of the shape */
  name?: string
  /** Text content */
  text?: string
  /** The type of fill for this shape */
  fill?: FillType
  /** The fill color */
  fillColor?: Rgb
  /** For linear and radial fills, this is the ending color */
  gradientColor?: Rgb
  /** Angle of a linear gradient fill */
  gradientAngle?: number
  /** Rotation of the graphic in degrees */
  rotation?: number
  /** Placement of the text inside the shape */
  textPlacement?: VerticalAlignment
  /** Autosizing behavior of the shape around the text */
  autosizing?: TextAutosizing
  /** Padding at the left and right of the text space */
  sidePadding?: Integer
  /** Padding at the top and bottom of the text space */
  verticalPadding?: Integer
  /** Canvas identifier for the shape */
  canvasId?: Integer
  /** Shape origin */
  origin?: Point
  /** Shape size */
  size?: Point
}

/** Input for creating a Line. */
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
  headMagnet?: Integer
  /** Which magnet of the source graphic the line attaches to */
  tailMagnet?: Integer
}

/** Input for updating a Line. Omitted fields are left unchanged. */
export interface LineUpdateInput {
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
  headMagnet?: Integer
  /** Which magnet of the source graphic the line attaches to */
  tailMagnet?: Integer
}

/** Input for creating a Group. */
export interface GroupCreateInput {
  /** Rotation of the group in degrees */
  rotation?: number
  /** Only connect to the group? */
  connectToGroupOnly?: boolean
}

/** Input for updating a Group. Omitted fields are left unchanged. */
export interface GroupUpdateInput {
  /** Rotation of the group in degrees */
  rotation?: number
  /** Only connect to the group? */
  connectToGroupOnly?: boolean
}

/** Input for creating a Layer. */
export interface LayerCreateInput {
  /** Layer name */
  name: string
  /** Are the layer's graphics locked? */
  locked?: boolean
  /** Are the layer's graphics visible? */
  visible?: boolean
  /** Do the layer's graphics print? */
  prints?: boolean
  /** Canvas identifier for the layer */
  canvasId: string
}

/** Input for updating a Layer. Omitted fields are left unchanged. */
export interface LayerUpdateInput {
  /** Layer name */
  name?: string
  /** Are the layer's graphics locked? */
  locked?: boolean
  /** Are the layer's graphics visible? */
  visible?: boolean
  /** Do the layer's graphics print? */
  prints?: boolean
  /** Canvas identifier for the layer */
  canvasId?: string
}

/** Input for creating a Subgraph. */
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

/** Input for updating a Subgraph. Omitted fields are left unchanged. */
export interface SubgraphUpdateInput {
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

/** Input for creating a Label. */
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

/** Input for updating a Label. Omitted fields are left unchanged. */
export interface LabelUpdateInput {
  /** The text inside the label */
  text?: string
  /** The position along the line */
  labelPosition?: number
  /** The offset from the line */
  labelOffset?: number
  /** The type of rotation around the line */
  labelRotation?: LabelOrientation
}

/** Input for creating a Grid. */
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
  majorSpacing?: Integer
  /** Does the grid draw in front of all shapes? */
  drawsInFront?: boolean
  /** Color of the grid */
  scriptGridColor?: Rgb
  /** Color of major lines */
  scriptMajorGridColor?: Rgb
}

/** Input for updating a Grid. Omitted fields are left unchanged. */
export interface GridUpdateInput {
  /** Is the grid visible? */
  visible?: boolean
  /** Do points snap to the grid? */
  snaps?: boolean
  /** Number of pixels between minor grid lines */
  spacing?: number
  /** Does the grid have 'major' lines? */
  major?: boolean
  /** The number of minor grid lines for each major line */
  majorSpacing?: Integer
  /** Does the grid draw in front of all shapes? */
  drawsInFront?: boolean
  /** Color of the grid */
  scriptGridColor?: Rgb
  /** Color of major lines */
  scriptMajorGridColor?: Rgb
}

/** Input for creating a Master. */
export interface MasterCreateInput {
  /** Unique identifier */
  id?: string
  /** Name of this master */
  name?: string
}

/** Input for updating a Master. Omitted fields are left unchanged. */
export interface MasterUpdateInput {
  /** Unique identifier */
  id?: string
  /** Name of this master */
  name?: string
}

/** Input for creating an ExportSettings. */
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

/** Input for updating an ExportSettings. Omitted fields are left unchanged. */
export interface ExportSettingsUpdateInput {
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

/** A drawing page/canvas in OmniGraffle */
export interface CanvasResourceClient {
  /** List canvases. */
  list(options?: CallOptions): Promise<readonly Canvas[]>
  /** Read the canvas identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Canvas>
  /** Create a canvas. */
  create(input: CanvasCreateInput, options?: CallOptions): Promise<Canvas>
}

/** Base class for visual elements in OmniGraffle */
export interface GraphicResourceClient {
  /** List graphics. */
  list(canvasId: string, options?: CallOptions): Promise<readonly Graphic[]>
  /** Read the graphic identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Graphic>
}

/** A shape graphic in OmniGraffle */
export interface ShapeResourceClient {
  /** List shapes. */
  list(canvasId: string, options?: CallOptions): Promise<readonly Shape[]>
  /** Read the shape identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Shape>
  /** Create a shape. */
  create(input: ShapeCreateInput, options?: CallOptions): Promise<Shape>
}

/** A line/connector in OmniGraffle */
export interface LineResourceClient {
  /** List lines. */
  list(canvasId: string, options?: CallOptions): Promise<readonly Line[]>
  /** Read the line identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Line>
}

/** A drawing layer in OmniGraffle */
export interface LayerResourceClient {
  /** List layers. */
  list(canvasId: string, options?: CallOptions): Promise<readonly Layer[]>
  /** Read the layer identified by `name`. */
  get(name: string, options?: CallOptions): Promise<Layer>
  /** Create a layer. */
  create(input: LayerCreateInput, options?: CallOptions): Promise<Layer>
}

/**
 * The OmniGraffle client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link omniGraffleContract}.
 */
export interface OmniGraffleClient {
  /** A drawing page/canvas in OmniGraffle */
  readonly canvases: CanvasResourceClient
  /** Base class for visual elements in OmniGraffle */
  readonly graphics: GraphicResourceClient
  /** A shape graphic in OmniGraffle */
  readonly shapes: ShapeResourceClient
  /** A line/connector in OmniGraffle */
  readonly lines: LineResourceClient
  /** A drawing layer in OmniGraffle */
  readonly layers: LayerResourceClient
  /** Draw a line between graphics */
  connect(from: string, to: string, options?: CallOptions): Promise<void>
  /** Layout graphics using the document's Layout Info */
  layout(options?: CallOptions): Promise<void>
  /** Export documents */
  _export(as: string, scope: ExportAreaType, to: string, options?: CallOptions): Promise<void>
  /** Flip graphics */
  flip(over: Orientation, options?: CallOptions): Promise<void>
  /** Slide graphics by a vector amount */
  slide(by: Point, options?: CallOptions): Promise<void>
  /** Group graphics */
  assemble(subgraph?: boolean, options?: CallOptions): Promise<void>
  /** Change the number of pages to fit the current graphics */
  pageAdjust(options?: CallOptions): Promise<void>
  /** Evaluate JavaScript and return the result */
  evaluateJavascript(script: string, options?: CallOptions): Promise<void>
}

/** The members of {@link HorizontalAlignment}, for its value type. */
const horizontalAlignmentMembers = ['left', 'center', 'right'] as const

/** The members of {@link VerticalAlignment}, for its value type. */
const verticalAlignmentMembers = ['top', 'center', 'bottom'] as const

/** The members of {@link StrokeCap}, for its value type. */
const strokeCapMembers = ['butt', 'round', 'square'] as const

/** The members of {@link StrokeJoin}, for its value type. */
const strokeJoinMembers = ['miter', 'round', 'bevel'] as const

/** The members of {@link FillType}, for its value type. */
const fillTypeMembers = ['noFill', 'solidFill', 'linearFill', 'radialFill'] as const

/** The members of {@link LineType}, for its value type. */
const lineTypeMembers = ['straight', 'curved', 'orthogonal', 'bezier'] as const

/** The members of {@link HopType}, for its value type. */
const hopTypeMembers = [
  'noHop',
  'roundHop',
  'squareHop',
  'twoSideHop',
  'threeSideHop',
  'ignoreHop',
  'gapHop',
  'bridgeHop',
] as const

/** The members of {@link LabelOrientation}, for its value type. */
const labelOrientationMembers = [
  'horizontal',
  'vertical',
  'parallel',
  'perpendicular',
  'custom',
] as const

/** The members of {@link TextAutosizing}, for its value type. */
const textAutosizingMembers = ['overflow', 'full', 'verticallyOnly', 'clip'] as const

/** The members of {@link Orientation}, for its value type. */
const orientationMembers = ['horizontally', 'vertically'] as const

/** The members of {@link ExportAreaType}, for its value type. */
const exportAreaTypeMembers = [
  'selectedGraphics',
  'allGraphics',
  'currentCanvas',
  'entireDocument',
] as const

const canvasRecordType: ValueType<Canvas> = t.record(
  {
    id: t.string({ description: 'Unique identifier' }),
    name: t.string({ description: 'Name of this canvas' }),
    adjustsPages: t.boolean({ description: 'Adjust number of pages on the canvas automatically?' }),
    canvasSizeIsMeasuredInPages: t.boolean({
      description: 'Whether canvas size is reported as multiples of page size',
    }),
    canvasSize: t.point({
      description: 'Size of the canvas (page size multiplied by number of pages)',
    }),
    pageSize: t.point({ description: 'Size of each page' }),
    horizontalPages: t.integer({ description: 'Horizontal pages' }),
    verticalPages: t.integer({ description: 'Vertical pages' }),
    columnAlignment: t.enumeration(horizontalAlignmentMembers, { description: 'Column alignment' }),
    rowAlignment: t.enumeration(verticalAlignmentMembers, { description: 'Row alignment' }),
    columnSpacing: t.double({ description: 'Spacing between graphics in a column' }),
    rowSpacing: t.double({ description: 'Spacing between graphics in a row' }),
  },
  { description: 'A drawing page/canvas in OmniGraffle' }
)

const graphicRecordType: ValueType<Graphic> = t.record(
  {
    id: t.string({ description: 'Unique identifier' }),
    origin: t.point({
      description:
        'Origin of the graphic (position of the upper-left corner of the bounding rectangle)',
    }),
    size: t.point({
      description: 'Size of the graphic (width and height of the bounding rectangle)',
    }),
    locked: t.boolean({ description: 'Is this graphic locked?' }),
    allowsConnections: t.boolean({ description: 'Does this graphic allow connections to it?' }),
    alignsEdgesToGrid: t.boolean({
      description: 'When snapped to the grid does this graphic align its edges to the grid?',
    }),
    cornerRadius: t.double({ description: 'Curvature of corners in the stroke path' }),
    drawsShadow: t.boolean({ description: 'Does this graphic draw its shadow?' }),
    drawsStroke: t.boolean({ description: 'Does this graphic draw its stroke?' }),
    doubleStroke: t.boolean({ description: 'Does this graphic have a double-lined stroke?' }),
    flippedHorizontally: t.boolean({ description: 'Is this graphic flipped horizontally?' }),
    flippedVertically: t.boolean({ description: 'Is this graphic flipped vertically?' }),
    shadowColor: t.rgb({ description: 'Color of the shadow' }),
    shadowFuzziness: t.double({ description: "The 'fuzziness' of the graphic's shadow" }),
    shadowVector: t.point({ description: "The direction of the graphic's shadow" }),
    shadowBeneath: t.boolean({
      description: 'Does this graphic draw its shadow immediately beneath itself?',
    }),
    strokeColor: t.rgb({ description: 'Color of the stroke' }),
    strokeCap: t.enumeration(strokeCapMembers, {
      description: 'Type of cap at ends of the stroke',
    }),
    strokeJoin: t.enumeration(strokeJoinMembers, {
      description: 'Type of join between segments of the stroke',
    }),
    strokePattern: t.integer({ description: 'Dash pattern of the stroke' }),
    thickness: t.double({ description: 'Thickness of the stroke' }),
    notes: t.string({ description: 'Notes for this graphic' }),
    userName: t.string({ description: 'Name of a graphic' }),
    tag: t.string({ description: 'Arbitrary string tag attached to this graphic' }),
    url: t.string({ description: 'Web link for this graphic' }),
    script: t.string({ description: 'Source of attached AppleScript' }),
    rankGroup: t.integer({
      description: 'Rank group assigned to this graphic for hierarchical layout',
    }),
  },
  { description: 'Base class for visual elements in OmniGraffle' }
)

const shapeRecordType: ValueType<Shape> = t.record(
  {
    id: t.string({ description: 'Unique identifier' }),
    name: t.string({ description: 'Name of the shape' }),
    text: t.string({ description: 'The text inside the shape' }),
    fill: t.enumeration(fillTypeMembers, { description: 'The type of fill for this shape' }),
    fillColor: t.rgb({ description: 'The fill color' }),
    gradientColor: t.rgb({ description: 'For linear and radial fills, this is the ending color' }),
    gradientAngle: t.double({ description: 'Angle of a linear gradient fill' }),
    rotation: t.double({ description: 'Rotation of the graphic in degrees' }),
    textPlacement: t.enumeration(verticalAlignmentMembers, {
      description: 'Placement of the text inside the shape',
    }),
    autosizing: t.enumeration(textAutosizingMembers, {
      description: 'Autosizing behavior of the shape around the text',
    }),
    sidePadding: t.integer({ description: 'Padding at the left and right of the text space' }),
    verticalPadding: t.integer({ description: 'Padding at the top and bottom of the text space' }),
  },
  { description: 'A shape graphic in OmniGraffle' }
)

const lineRecordType: ValueType<Line> = t.record(
  {
    id: t.string({ description: 'Unique identifier' }),
    lineType: t.enumeration(lineTypeMembers, { description: 'Type of the line' }),
    hopType: t.enumeration(hopTypeMembers, {
      description: 'The behavior when one line crosses over another line',
    }),
    headType: t.string({ description: 'Type of line ending on the head of the line' }),
    tailType: t.string({ description: 'Type of line ending on the tail of the line' }),
    headScale: t.double({ description: 'Scale of line ending on the head of the line' }),
    tailScale: t.double({ description: 'Scale of line ending on the tail of the line' }),
    headMagnet: t.integer({
      description: 'Which magnet of the destination graphic the line attaches to',
    }),
    tailMagnet: t.integer({
      description: 'Which magnet of the source graphic the line attaches to',
    }),
  },
  { description: 'A line/connector in OmniGraffle' }
)

const groupRecordType: ValueType<Group> = t.record(
  {
    id: t.string({ description: 'Unique identifier' }),
    rotation: t.double({ description: 'Rotation of the group in degrees' }),
    connectToGroupOnly: t.boolean({ description: 'Only connect to the group?' }),
  },
  { description: 'A group of graphics in OmniGraffle' }
)

const layerRecordType: ValueType<Layer> = t.record(
  {
    name: t.string({ description: 'Name of the layer' }),
    locked: t.boolean({ description: "Are the layer's graphics locked?" }),
    visible: t.boolean({ description: "Are the layer's graphics visible?" }),
    prints: t.boolean({ description: "Do the layer's graphics print?" }),
  },
  { description: 'A drawing layer in OmniGraffle' }
)

const subgraphRecordType: ValueType<Subgraph> = t.record(
  {
    id: t.string({ description: 'Unique identifier' }),
    collapsed: t.boolean({ description: 'Is the subgraph collapsed?' }),
    topMargin: t.double({ description: 'Top margin' }),
    bottomMargin: t.double({ description: 'Bottom margin' }),
    leftMargin: t.double({ description: 'Left margin' }),
    rightMargin: t.double({ description: 'Right margin' }),
  },
  { description: 'A subgraph container in OmniGraffle' }
)

const labelRecordType: ValueType<Label> = t.record(
  {
    id: t.string({ description: 'Unique identifier' }),
    text: t.string({ description: 'The text inside the label' }),
    labelPosition: t.double({ description: 'The position along the line' }),
    labelOffset: t.double({ description: 'The offset from the line' }),
    labelRotation: t.enumeration(labelOrientationMembers, {
      description: 'The type of rotation around the line',
    }),
  },
  { description: 'A text label on a line' }
)

const gridRecordType: ValueType<Grid> = t.record(
  {
    visible: t.boolean({ description: 'Is the grid visible?' }),
    snaps: t.boolean({ description: 'Do points snap to the grid?' }),
    spacing: t.double({ description: 'Number of pixels between minor grid lines' }),
    major: t.boolean({ description: "Does the grid have 'major' lines?" }),
    majorSpacing: t.integer({ description: 'The number of minor grid lines for each major line' }),
    drawsInFront: t.boolean({ description: 'Does the grid draw in front of all shapes?' }),
    scriptGridColor: t.rgb({ description: 'Color of the grid' }),
    scriptMajorGridColor: t.rgb({ description: 'Color of major lines' }),
  },
  { description: 'Grid settings for a canvas' }
)

const masterRecordType: ValueType<Master> = t.record(
  {
    id: t.string({ description: 'Unique identifier' }),
    name: t.string({ description: 'Name of this master' }),
  },
  { description: 'A reusable template/master in OmniGraffle' }
)

const exportSettingsRecordType: ValueType<ExportSettings> = t.record(
  {
    areaType: t.enumeration(exportAreaTypeMembers, {
      description: 'The type of area to be exported',
    }),
    exportScale: t.double({ description: 'The scale to use during export' }),
    resolution: t.double({
      description: 'The number of pixels per point in the resulting exported image',
    }),
    drawsBackground: t.boolean({ description: 'Draw the background canvas color' }),
    includeBorder: t.boolean({ description: 'Whether or not to include a border area' }),
    borderAmount: t.double({ description: 'The number of pixels of border area to include' }),
    includeNonprintingLayers: t.boolean({
      description: 'Whether to export with non printing layers',
    }),
    useArtboards: t.boolean({ description: 'Whether to export with artboards' }),
  },
  { description: 'Export configuration settings' }
)

const canvasCreateInputType: ValueType<CanvasCreateInput> = t.record({
  id: t.optional(t.string({ description: 'Unique identifier' })),
  name: t.string({ description: 'Canvas name' }),
  adjustsPages: t.optional(
    t.boolean({ description: 'Adjust number of pages on the canvas automatically?' })
  ),
  canvasSizeIsMeasuredInPages: t.optional(
    t.boolean({ description: 'Whether canvas size is reported as multiples of page size' })
  ),
  canvasSize: t.optional(
    t.point({ description: 'Size of the canvas (page size multiplied by number of pages)' })
  ),
  horizontalPages: t.optional(t.integer({ description: 'Horizontal pages' })),
  verticalPages: t.optional(t.integer({ description: 'Vertical pages' })),
  columnAlignment: t.optional(
    t.enumeration(horizontalAlignmentMembers, { description: 'Column alignment' })
  ),
  rowAlignment: t.optional(
    t.enumeration(verticalAlignmentMembers, { description: 'Row alignment' })
  ),
  columnSpacing: t.optional(t.double({ description: 'Spacing between graphics in a column' })),
  rowSpacing: t.optional(t.double({ description: 'Spacing between graphics in a row' })),
})

const shapeCreateInputType: ValueType<ShapeCreateInput> = t.record({
  name: t.optional(t.string({ description: 'Name of the shape' })),
  text: t.optional(t.string({ description: 'Text content' })),
  fill: t.optional(
    t.enumeration(fillTypeMembers, { description: 'The type of fill for this shape' })
  ),
  fillColor: t.optional(t.rgb({ description: 'The fill color' })),
  gradientColor: t.optional(
    t.rgb({ description: 'For linear and radial fills, this is the ending color' })
  ),
  gradientAngle: t.optional(t.double({ description: 'Angle of a linear gradient fill' })),
  rotation: t.optional(t.double({ description: 'Rotation of the graphic in degrees' })),
  textPlacement: t.optional(
    t.enumeration(verticalAlignmentMembers, {
      description: 'Placement of the text inside the shape',
    })
  ),
  autosizing: t.optional(
    t.enumeration(textAutosizingMembers, {
      description: 'Autosizing behavior of the shape around the text',
    })
  ),
  sidePadding: t.optional(
    t.integer({ description: 'Padding at the left and right of the text space' })
  ),
  verticalPadding: t.optional(
    t.integer({ description: 'Padding at the top and bottom of the text space' })
  ),
  canvasId: t.integer({ description: 'Canvas identifier for the shape' }),
  origin: t.point({ description: 'Shape origin' }),
  size: t.point({ description: 'Shape size' }),
})

const layerCreateInputType: ValueType<LayerCreateInput> = t.record({
  name: t.string({ description: 'Layer name' }),
  locked: t.optional(t.boolean({ description: "Are the layer's graphics locked?" })),
  visible: t.optional(t.boolean({ description: "Are the layer's graphics visible?" })),
  prints: t.optional(t.boolean({ description: "Do the layer's graphics print?" })),
  canvasId: t.string({ description: 'Canvas identifier for the layer' }),
})

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<OmniGraffleClient>['resources'] = {
  Canvas: {
    name: 'Canvas',
    record: canvasRecordType,
    id: t.string({ description: 'Unique identifier' }),
    get: 'omnigraffle.canvases.getCanvas',
    list: 'omnigraffle.canvases.listCanvases',
  },
  Graphic: {
    name: 'Graphic',
    record: graphicRecordType,
    id: t.string({ description: 'Unique identifier' }),
    get: 'omnigraffle.graphics.getGraphic',
    list: 'omnigraffle.graphics.listGraphics',
  },
  Shape: {
    name: 'Shape',
    record: shapeRecordType,
    id: t.string({ description: 'Unique identifier' }),
    get: 'omnigraffle.shapes.getShape',
    list: 'omnigraffle.shapes.listShapes',
  },
  Line: {
    name: 'Line',
    record: lineRecordType,
    id: t.string({ description: 'Unique identifier' }),
    get: 'omnigraffle.lines.getLine',
    list: 'omnigraffle.lines.listLines',
  },
  Group: {
    name: 'Group',
    record: groupRecordType,
    id: t.string({ description: 'Unique identifier' }),
  },
  Layer: {
    name: 'Layer',
    record: layerRecordType,
    id: t.string({ description: 'Name of the layer' }),
    get: 'omnigraffle.layers.getLayer',
    list: 'omnigraffle.layers.listLayers',
  },
  Subgraph: {
    name: 'Subgraph',
    record: subgraphRecordType,
    id: t.string({ description: 'Unique identifier' }),
  },
  Label: {
    name: 'Label',
    record: labelRecordType,
    id: t.string({ description: 'Unique identifier' }),
  },
  Grid: {
    name: 'Grid',
    record: gridRecordType,
  },
  Master: {
    name: 'Master',
    record: masterRecordType,
    id: t.string({ description: 'Unique identifier' }),
  },
  ExportSettings: {
    name: 'ExportSettings',
    record: exportSettingsRecordType,
  },
}

const canvasListCanvasesOperation: OperationDescriptor<Record<string, never>, readonly Canvas[]> = {
  id: 'omnigraffle.canvases.listCanvases',
  permission: 'omnigraffle:canvases:list',
  target: { command: 'listCanvases', resource: 'Canvas' },
  description: 'List all canvases',
  input: t.record({}),
  output: t.array(canvasRecordType),
}

const canvasGetCanvasOperation: OperationDescriptor<{ readonly id: string }, Canvas> = {
  id: 'omnigraffle.canvases.getCanvas',
  permission: 'omnigraffle:canvases:get',
  target: { command: 'getCanvas', resource: 'Canvas' },
  description: 'Get a canvas by ID',
  input: t.record({
    id: t.string({ description: 'Canvas identifier' }),
  }),
  output: canvasRecordType,
}

const canvasCreateCanvasOperation: OperationDescriptor<CanvasCreateInput, Canvas> = {
  id: 'omnigraffle.canvases.createCanvas',
  permission: 'omnigraffle:canvases:create',
  target: { command: 'createCanvas', resource: 'Canvas' },
  description: 'Create a new canvas',
  input: canvasCreateInputType,
  output: canvasRecordType,
}

const graphicListGraphicsOperation: OperationDescriptor<
  { readonly canvasId: string },
  readonly Graphic[]
> = {
  id: 'omnigraffle.graphics.listGraphics',
  permission: 'omnigraffle:graphics:list',
  target: { command: 'listGraphics', resource: 'Graphic' },
  description: 'List all graphics on a canvas',
  input: t.record({
    canvasId: t.string({ description: 'Canvas identifier' }),
  }),
  output: t.array(graphicRecordType),
}

const graphicGetGraphicOperation: OperationDescriptor<{ readonly id: string }, Graphic> = {
  id: 'omnigraffle.graphics.getGraphic',
  permission: 'omnigraffle:graphics:get',
  target: { command: 'getGraphic', resource: 'Graphic' },
  description: 'Get a graphic by ID',
  input: t.record({
    id: t.string({ description: 'Graphic identifier' }),
  }),
  output: graphicRecordType,
}

const shapeListShapesOperation: OperationDescriptor<
  { readonly canvasId: string },
  readonly Shape[]
> = {
  id: 'omnigraffle.shapes.listShapes',
  permission: 'omnigraffle:shapes:list',
  target: { command: 'listShapes', resource: 'Shape' },
  description: 'List all shapes on a canvas',
  input: t.record({
    canvasId: t.string({ description: 'Canvas identifier' }),
  }),
  output: t.array(shapeRecordType),
}

const shapeGetShapeOperation: OperationDescriptor<{ readonly id: string }, Shape> = {
  id: 'omnigraffle.shapes.getShape',
  permission: 'omnigraffle:shapes:get',
  target: { command: 'getShape', resource: 'Shape' },
  description: 'Get a shape by ID',
  input: t.record({
    id: t.string({ description: 'Shape identifier' }),
  }),
  output: shapeRecordType,
}

const shapeCreateShapeOperation: OperationDescriptor<ShapeCreateInput, Shape> = {
  id: 'omnigraffle.shapes.createShape',
  permission: 'omnigraffle:shapes:create',
  target: { command: 'createShape', resource: 'Shape' },
  description: 'Create a new shape',
  input: shapeCreateInputType,
  output: shapeRecordType,
}

const lineListLinesOperation: OperationDescriptor<{ readonly canvasId: string }, readonly Line[]> =
  {
    id: 'omnigraffle.lines.listLines',
    permission: 'omnigraffle:lines:list',
    target: { command: 'listLines', resource: 'Line' },
    description: 'List all lines on a canvas',
    input: t.record({
      canvasId: t.string({ description: 'Canvas identifier' }),
    }),
    output: t.array(lineRecordType),
  }

const lineGetLineOperation: OperationDescriptor<{ readonly id: string }, Line> = {
  id: 'omnigraffle.lines.getLine',
  permission: 'omnigraffle:lines:get',
  target: { command: 'getLine', resource: 'Line' },
  description: 'Get a line by ID',
  input: t.record({
    id: t.string({ description: 'Line identifier' }),
  }),
  output: lineRecordType,
}

const layerListLayersOperation: OperationDescriptor<
  { readonly canvasId: string },
  readonly Layer[]
> = {
  id: 'omnigraffle.layers.listLayers',
  permission: 'omnigraffle:layers:list',
  target: { command: 'listLayers', resource: 'Layer' },
  description: 'List all layers on a canvas',
  input: t.record({
    canvasId: t.string({ description: 'Canvas identifier' }),
  }),
  output: t.array(layerRecordType),
}

const layerGetLayerOperation: OperationDescriptor<{ readonly name: string }, Layer> = {
  id: 'omnigraffle.layers.getLayer',
  permission: 'omnigraffle:layers:get',
  target: { command: 'getLayer', resource: 'Layer' },
  description: 'Get a layer by name',
  input: t.record({
    name: t.string({ description: 'Layer name' }),
  }),
  output: layerRecordType,
}

const layerCreateLayerOperation: OperationDescriptor<LayerCreateInput, Layer> = {
  id: 'omnigraffle.layers.createLayer',
  permission: 'omnigraffle:layers:create',
  target: { command: 'createLayer', resource: 'Layer' },
  description: 'Create a new layer',
  input: layerCreateInputType,
  output: layerRecordType,
}

const appConnectOperation: OperationDescriptor<
  { readonly from: string; readonly to: string },
  undefined
> = {
  id: 'omnigraffle.app.connect',
  permission: 'omnigraffle:app:connect',
  target: { command: 'connect' },
  description: 'Draw a line between graphics',
  input: t.record({
    from: t.string({ description: 'Source graphic ID' }),
    to: t.string({ description: 'Destination graphic ID' }),
  }),
  output: t.none(),
}

const appLayoutOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omnigraffle.app.layout',
  permission: 'omnigraffle:app:layout',
  target: { command: 'layout' },
  description: "Layout graphics using the document's Layout Info",
  input: t.record({}),
  output: t.none(),
}

const appExportOperation: OperationDescriptor<
  { readonly as: string; readonly scope: ExportAreaType; readonly to: string },
  undefined
> = {
  id: 'omnigraffle.app.export',
  permission: 'omnigraffle:app:export',
  target: { command: 'export' },
  description: 'Export documents',
  input: t.record({
    as: t.string({ description: 'File type' }),
    scope: t.enumeration(exportAreaTypeMembers, { description: 'Area to export' }),
    to: t.string({ description: 'Output file path' }),
  }),
  output: t.none(),
}

const appFlipOperation: OperationDescriptor<{ readonly over: Orientation }, undefined> = {
  id: 'omnigraffle.app.flip',
  permission: 'omnigraffle:app:flip',
  target: { command: 'flip' },
  description: 'Flip graphics',
  input: t.record({
    over: t.enumeration(orientationMembers, { description: 'Flip orientation' }),
  }),
  output: t.none(),
}

const appSlideOperation: OperationDescriptor<{ readonly by: Point }, undefined> = {
  id: 'omnigraffle.app.slide',
  permission: 'omnigraffle:app:slide',
  target: { command: 'slide' },
  description: 'Slide graphics by a vector amount',
  input: t.record({
    by: t.point({ description: 'Vector to slide by' }),
  }),
  output: t.none(),
}

const appAssembleOperation: OperationDescriptor<
  { readonly subgraph?: boolean | undefined },
  undefined
> = {
  id: 'omnigraffle.app.assemble',
  permission: 'omnigraffle:app:assemble',
  target: { command: 'assemble' },
  description: 'Group graphics',
  input: t.record({
    subgraph: t.optional(t.boolean({ description: 'Create as subgraph' })),
  }),
  output: t.none(),
}

const appPageAdjustOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omnigraffle.app.pageAdjust',
  permission: 'omnigraffle:app:pageAdjust',
  target: { command: 'pageAdjust' },
  description: 'Change the number of pages to fit the current graphics',
  input: t.record({}),
  output: t.none(),
}

const appEvaluateJavascriptOperation: OperationDescriptor<{ readonly script: string }, undefined> =
  {
    id: 'omnigraffle.app.evaluateJavascript',
    permission: 'omnigraffle:app:evaluateJavascript',
    target: { command: 'evaluateJavascript' },
    description: 'Evaluate JavaScript and return the result',
    input: t.record({
      script: t.string({ description: 'JavaScript code to evaluate' }),
    }),
    output: t.none(),
  }

/** Every operation, keyed by its identity. */
const operations: AppContract<OmniGraffleClient>['operations'] = {
  'omnigraffle.canvases.listCanvases': canvasListCanvasesOperation,
  'omnigraffle.canvases.getCanvas': canvasGetCanvasOperation,
  'omnigraffle.canvases.createCanvas': canvasCreateCanvasOperation,
  'omnigraffle.graphics.listGraphics': graphicListGraphicsOperation,
  'omnigraffle.graphics.getGraphic': graphicGetGraphicOperation,
  'omnigraffle.shapes.listShapes': shapeListShapesOperation,
  'omnigraffle.shapes.getShape': shapeGetShapeOperation,
  'omnigraffle.shapes.createShape': shapeCreateShapeOperation,
  'omnigraffle.lines.listLines': lineListLinesOperation,
  'omnigraffle.lines.getLine': lineGetLineOperation,
  'omnigraffle.layers.listLayers': layerListLayersOperation,
  'omnigraffle.layers.getLayer': layerGetLayerOperation,
  'omnigraffle.layers.createLayer': layerCreateLayerOperation,
  'omnigraffle.app.connect': appConnectOperation,
  'omnigraffle.app.layout': appLayoutOperation,
  'omnigraffle.app.export': appExportOperation,
  'omnigraffle.app.flip': appFlipOperation,
  'omnigraffle.app.slide': appSlideOperation,
  'omnigraffle.app.assemble': appAssembleOperation,
  'omnigraffle.app.pageAdjust': appPageAdjustOperation,
  'omnigraffle.app.evaluateJavascript': appEvaluateJavascriptOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): OmniGraffleClient {
  return {
    canvases: {
      list: (options) => runtime.invoke(canvasListCanvasesOperation, {}, options),
      get: (id, options) => runtime.invoke(canvasGetCanvasOperation, { id }, options),
      create: (input, options) => runtime.invoke(canvasCreateCanvasOperation, input, options),
    },
    graphics: {
      list: (canvasId, options) =>
        runtime.invoke(graphicListGraphicsOperation, { canvasId }, options),
      get: (id, options) => runtime.invoke(graphicGetGraphicOperation, { id }, options),
    },
    shapes: {
      list: (canvasId, options) => runtime.invoke(shapeListShapesOperation, { canvasId }, options),
      get: (id, options) => runtime.invoke(shapeGetShapeOperation, { id }, options),
      create: (input, options) => runtime.invoke(shapeCreateShapeOperation, input, options),
    },
    lines: {
      list: (canvasId, options) => runtime.invoke(lineListLinesOperation, { canvasId }, options),
      get: (id, options) => runtime.invoke(lineGetLineOperation, { id }, options),
    },
    layers: {
      list: (canvasId, options) => runtime.invoke(layerListLayersOperation, { canvasId }, options),
      get: (name, options) => runtime.invoke(layerGetLayerOperation, { name }, options),
      create: (input, options) => runtime.invoke(layerCreateLayerOperation, input, options),
    },
    connect: (from, to, options) => runtime.invoke(appConnectOperation, { from, to }, options),
    layout: (options) => runtime.invoke(appLayoutOperation, {}, options),
    _export: (as, scope, to, options) =>
      runtime.invoke(appExportOperation, { as, scope, to }, options),
    flip: (over, options) => runtime.invoke(appFlipOperation, { over }, options),
    slide: (by, options) => runtime.invoke(appSlideOperation, { by }, options),
    assemble: (subgraph, options) => runtime.invoke(appAssembleOperation, { subgraph }, options),
    pageAdjust: (options) => runtime.invoke(appPageAdjustOperation, {}, options),
    evaluateJavascript: (script, options) =>
      runtime.invoke(appEvaluateJavascriptOperation, { script }, options),
  }
}

/**
 * The OmniGraffle contract. Pass it to a client factory to obtain a
 * {@link OmniGraffleClient}.
 */
export const omniGraffleContract: AppContract<OmniGraffleClient> = {
  app: 'omnigraffle',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
