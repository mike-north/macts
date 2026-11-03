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
  type ClientBrand,
  type ClientRuntime,
  type Integer,
  type OperationDescriptor,
  type Page,
  type Point,
  type ResourceDescriptor,
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
  /**
   * Unique identifier.
   * Never null: the primary identifier.
   */
  id: string
  /**
   * Name of this canvas.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * Adjust number of pages on the canvas automatically?
   * Nullable. No evidence that the app always sets it.
   */
  adjustsPages: boolean | null
  /**
   * Whether canvas size is reported as multiples of page size.
   * Nullable. No evidence that the app always sets it.
   */
  canvasSizeIsMeasuredInPages: boolean | null
  /**
   * Size of the canvas (page size multiplied by number of pages).
   * Nullable. No evidence that the app always sets it.
   */
  canvasSize: Point | null
  /**
   * Size of each page.
   * Nullable. No evidence that the app always sets it.
   */
  readonly pageSize: Point | null
  /**
   * Horizontal pages.
   * Nullable. No evidence that the app always sets it.
   */
  horizontalPages: Integer | null
  /**
   * Vertical pages.
   * Nullable. No evidence that the app always sets it.
   */
  verticalPages: Integer | null
  /**
   * Column alignment.
   * Nullable. No evidence that the app always sets it.
   */
  columnAlignment: HorizontalAlignment | null
  /**
   * Row alignment.
   * Nullable. No evidence that the app always sets it.
   */
  rowAlignment: VerticalAlignment | null
  /**
   * Spacing between graphics in a column.
   * Nullable. No evidence that the app always sets it.
   */
  columnSpacing: number | null
  /**
   * Spacing between graphics in a row.
   * Nullable. No evidence that the app always sets it.
   */
  rowSpacing: number | null
}

/** Base class for visual elements in OmniGraffle */
export interface Graphic {
  /**
   * Unique identifier.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * Origin of the graphic (position of the upper-left corner of the bounding rectangle).
   * Nullable. No evidence that the app always sets it.
   */
  origin: Point | null
  /**
   * Size of the graphic (width and height of the bounding rectangle).
   * Nullable. No evidence that the app always sets it.
   */
  size: Point | null
  /**
   * Is this graphic locked?
   * Nullable. No evidence that the app always sets it.
   */
  locked: boolean | null
  /**
   * Does this graphic allow connections to it?
   * Nullable. No evidence that the app always sets it.
   */
  allowsConnections: boolean | null
  /**
   * When snapped to the grid does this graphic align its edges to the grid?
   * Nullable. No evidence that the app always sets it.
   */
  alignsEdgesToGrid: boolean | null
  /**
   * Curvature of corners in the stroke path.
   * Nullable. No evidence that the app always sets it.
   */
  cornerRadius: number | null
  /**
   * Does this graphic draw its shadow?
   * Nullable. No evidence that the app always sets it.
   */
  drawsShadow: boolean | null
  /**
   * Does this graphic draw its stroke?
   * Nullable. No evidence that the app always sets it.
   */
  drawsStroke: boolean | null
  /**
   * Does this graphic have a double-lined stroke?
   * Nullable. No evidence that the app always sets it.
   */
  doubleStroke: boolean | null
  /**
   * Is this graphic flipped horizontally?
   * Nullable. No evidence that the app always sets it.
   */
  flippedHorizontally: boolean | null
  /**
   * Is this graphic flipped vertically?
   * Nullable. No evidence that the app always sets it.
   */
  flippedVertically: boolean | null
  /**
   * Color of the shadow.
   * Nullable. No evidence that the app always sets it.
   */
  shadowColor: Rgb | null
  /**
   * The 'fuzziness' of the graphic's shadow.
   * Nullable. No evidence that the app always sets it.
   */
  shadowFuzziness: number | null
  /**
   * The direction of the graphic's shadow.
   * Nullable. No evidence that the app always sets it.
   */
  shadowVector: Point | null
  /**
   * Does this graphic draw its shadow immediately beneath itself?
   * Nullable. No evidence that the app always sets it.
   */
  shadowBeneath: boolean | null
  /**
   * Color of the stroke.
   * Nullable. No evidence that the app always sets it.
   */
  strokeColor: Rgb | null
  /**
   * Type of cap at ends of the stroke.
   * Nullable. No evidence that the app always sets it.
   */
  strokeCap: StrokeCap | null
  /**
   * Type of join between segments of the stroke.
   * Nullable. No evidence that the app always sets it.
   */
  strokeJoin: StrokeJoin | null
  /**
   * Dash pattern of the stroke.
   * Nullable. No evidence that the app always sets it.
   */
  strokePattern: Integer | null
  /**
   * Thickness of the stroke.
   * Nullable. No evidence that the app always sets it.
   */
  thickness: number | null
  /**
   * Notes for this graphic.
   * Nullable. No evidence that the app always sets it.
   */
  notes: string | null
  /**
   * Name of a graphic.
   * Nullable. No evidence that the app always sets it.
   */
  userName: string | null
  /**
   * Arbitrary string tag attached to this graphic.
   * Nullable. No evidence that the app always sets it.
   */
  tag: string | null
  /**
   * Web link for this graphic.
   * Nullable. No evidence that the app always sets it.
   */
  url: string | null
  /**
   * Source of attached AppleScript.
   * Nullable. No evidence that the app always sets it.
   */
  script: string | null
  /**
   * Rank group assigned to this graphic for hierarchical layout.
   * Nullable. No evidence that the app always sets it.
   */
  rankGroup: Integer | null
}

/** A shape graphic in OmniGraffle */
export interface Shape {
  /**
   * Unique identifier.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * Name of the shape.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The text inside the shape.
   * Nullable. No evidence that the app always sets it.
   */
  text: string | null
  /**
   * The type of fill for this shape.
   * Nullable. No evidence that the app always sets it.
   */
  fill: FillType | null
  /**
   * The fill color.
   * Nullable. No evidence that the app always sets it.
   */
  fillColor: Rgb | null
  /**
   * For linear and radial fills, this is the ending color.
   * Nullable. No evidence that the app always sets it.
   */
  gradientColor: Rgb | null
  /**
   * Angle of a linear gradient fill.
   * Nullable. No evidence that the app always sets it.
   */
  gradientAngle: number | null
  /**
   * Rotation of the graphic in degrees.
   * Nullable. No evidence that the app always sets it.
   */
  rotation: number | null
  /**
   * Placement of the text inside the shape.
   * Nullable. No evidence that the app always sets it.
   */
  textPlacement: VerticalAlignment | null
  /**
   * Autosizing behavior of the shape around the text.
   * Nullable. No evidence that the app always sets it.
   */
  autosizing: TextAutosizing | null
  /**
   * Padding at the left and right of the text space.
   * Nullable. No evidence that the app always sets it.
   */
  sidePadding: Integer | null
  /**
   * Padding at the top and bottom of the text space.
   * Nullable. No evidence that the app always sets it.
   */
  verticalPadding: Integer | null
}

/** A line/connector in OmniGraffle */
export interface Line {
  /**
   * Unique identifier.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * Type of the line.
   * Nullable. No evidence that the app always sets it.
   */
  lineType: LineType | null
  /**
   * The behavior when one line crosses over another line.
   * Nullable. No evidence that the app always sets it.
   */
  hopType: HopType | null
  /**
   * Type of line ending on the head of the line.
   * Nullable. No evidence that the app always sets it.
   */
  headType: string | null
  /**
   * Type of line ending on the tail of the line.
   * Nullable. No evidence that the app always sets it.
   */
  tailType: string | null
  /**
   * Scale of line ending on the head of the line.
   * Nullable. No evidence that the app always sets it.
   */
  headScale: number | null
  /**
   * Scale of line ending on the tail of the line.
   * Nullable. No evidence that the app always sets it.
   */
  tailScale: number | null
  /**
   * Which magnet of the destination graphic the line attaches to.
   * Nullable. No evidence that the app always sets it.
   */
  headMagnet: Integer | null
  /**
   * Which magnet of the source graphic the line attaches to.
   * Nullable. No evidence that the app always sets it.
   */
  tailMagnet: Integer | null
}

/** A group of graphics in OmniGraffle */
export interface Group {
  /**
   * Unique identifier.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * Rotation of the group in degrees.
   * Nullable. No evidence that the app always sets it.
   */
  rotation: number | null
  /**
   * Only connect to the group?
   * Nullable. No evidence that the app always sets it.
   */
  connectToGroupOnly: boolean | null
}

/** A drawing layer in OmniGraffle */
export interface Layer {
  /**
   * Name of the layer.
   * Never null: the primary identifier.
   */
  name: string
  /**
   * Are the layer's graphics locked?
   * Nullable. No evidence that the app always sets it.
   */
  locked: boolean | null
  /**
   * Are the layer's graphics visible?
   * Nullable. No evidence that the app always sets it.
   */
  visible: boolean | null
  /**
   * Do the layer's graphics print?
   * Nullable. No evidence that the app always sets it.
   */
  prints: boolean | null
}

/** A subgraph container in OmniGraffle */
export interface Subgraph {
  /**
   * Unique identifier.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * Is the subgraph collapsed?
   * Nullable. No evidence that the app always sets it.
   */
  collapsed: boolean | null
  /**
   * Top margin.
   * Nullable. No evidence that the app always sets it.
   */
  topMargin: number | null
  /**
   * Bottom margin.
   * Nullable. No evidence that the app always sets it.
   */
  bottomMargin: number | null
  /**
   * Left margin.
   * Nullable. No evidence that the app always sets it.
   */
  leftMargin: number | null
  /**
   * Right margin.
   * Nullable. No evidence that the app always sets it.
   */
  rightMargin: number | null
}

/** A text label on a line */
export interface Label {
  /**
   * Unique identifier.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The text inside the label.
   * Nullable. No evidence that the app always sets it.
   */
  text: string | null
  /**
   * The position along the line.
   * Nullable. No evidence that the app always sets it.
   */
  labelPosition: number | null
  /**
   * The offset from the line.
   * Nullable. No evidence that the app always sets it.
   */
  labelOffset: number | null
  /**
   * The type of rotation around the line.
   * Nullable. No evidence that the app always sets it.
   */
  labelRotation: LabelOrientation | null
}

/** Grid settings for a canvas */
export interface Grid {
  /**
   * Is the grid visible?
   * Nullable. No evidence that the app always sets it.
   */
  visible: boolean | null
  /**
   * Do points snap to the grid?
   * Nullable. No evidence that the app always sets it.
   */
  snaps: boolean | null
  /**
   * Number of pixels between minor grid lines.
   * Nullable. No evidence that the app always sets it.
   */
  spacing: number | null
  /**
   * Does the grid have 'major' lines?
   * Nullable. No evidence that the app always sets it.
   */
  major: boolean | null
  /**
   * The number of minor grid lines for each major line.
   * Nullable. No evidence that the app always sets it.
   */
  majorSpacing: Integer | null
  /**
   * Does the grid draw in front of all shapes?
   * Nullable. No evidence that the app always sets it.
   */
  drawsInFront: boolean | null
  /**
   * Color of the grid.
   * Nullable. No evidence that the app always sets it.
   */
  scriptGridColor: Rgb | null
  /**
   * Color of major lines.
   * Nullable. No evidence that the app always sets it.
   */
  scriptMajorGridColor: Rgb | null
}

/** A reusable template/master in OmniGraffle */
export interface Master {
  /**
   * Unique identifier.
   * Never null: the primary identifier.
   */
  id: string
  /**
   * Name of this master.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
}

/** Export configuration settings */
export interface ExportSettings {
  /**
   * The type of area to be exported.
   * Nullable. No evidence that the app always sets it.
   */
  areaType: ExportAreaType | null
  /**
   * The scale to use during export.
   * Nullable. No evidence that the app always sets it.
   */
  exportScale: number | null
  /**
   * The number of pixels per point in the resulting exported image.
   * Nullable. No evidence that the app always sets it.
   */
  resolution: number | null
  /**
   * Draw the background canvas color.
   * Nullable. No evidence that the app always sets it.
   */
  drawsBackground: boolean | null
  /**
   * Whether or not to include a border area.
   * Nullable. No evidence that the app always sets it.
   */
  includeBorder: boolean | null
  /**
   * The number of pixels of border area to include.
   * Nullable. No evidence that the app always sets it.
   */
  borderAmount: number | null
  /**
   * Whether to export with non printing layers.
   * Nullable. No evidence that the app always sets it.
   */
  includeNonprintingLayers: boolean | null
  /**
   * Whether to export with artboards.
   * Nullable. No evidence that the app always sets it.
   */
  useArtboards: boolean | null
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
  /**
   * Unique identifier.
   * Cannot be reset: null is rejected.
   */
  id?: string
  /**
   * Canvas name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Adjust number of pages on the canvas automatically?
   * Cannot be reset: null is rejected.
   */
  adjustsPages?: boolean
  /**
   * Whether canvas size is reported as multiples of page size.
   * Cannot be reset: null is rejected.
   */
  canvasSizeIsMeasuredInPages?: boolean
  /**
   * Size of the canvas (page size multiplied by number of pages).
   * Cannot be reset: null is rejected.
   */
  canvasSize?: Point
  /**
   * Horizontal pages.
   * Cannot be reset: null is rejected.
   */
  horizontalPages?: Integer
  /**
   * Vertical pages.
   * Cannot be reset: null is rejected.
   */
  verticalPages?: Integer
  /**
   * Column alignment.
   * Cannot be reset: null is rejected.
   */
  columnAlignment?: HorizontalAlignment
  /**
   * Row alignment.
   * Cannot be reset: null is rejected.
   */
  rowAlignment?: VerticalAlignment
  /**
   * Spacing between graphics in a column.
   * Cannot be reset: null is rejected.
   */
  columnSpacing?: number
  /**
   * Spacing between graphics in a row.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * Origin of the graphic (position of the upper-left corner of the bounding rectangle).
   * Cannot be reset: null is rejected.
   */
  origin?: Point
  /**
   * Size of the graphic (width and height of the bounding rectangle).
   * Cannot be reset: null is rejected.
   */
  size?: Point
  /**
   * Is this graphic locked?
   * Cannot be reset: null is rejected.
   */
  locked?: boolean
  /**
   * Does this graphic allow connections to it?
   * Cannot be reset: null is rejected.
   */
  allowsConnections?: boolean
  /**
   * When snapped to the grid does this graphic align its edges to the grid?
   * Cannot be reset: null is rejected.
   */
  alignsEdgesToGrid?: boolean
  /**
   * Curvature of corners in the stroke path.
   * Cannot be reset: null is rejected.
   */
  cornerRadius?: number
  /**
   * Does this graphic draw its shadow?
   * Cannot be reset: null is rejected.
   */
  drawsShadow?: boolean
  /**
   * Does this graphic draw its stroke?
   * Cannot be reset: null is rejected.
   */
  drawsStroke?: boolean
  /**
   * Does this graphic have a double-lined stroke?
   * Cannot be reset: null is rejected.
   */
  doubleStroke?: boolean
  /**
   * Is this graphic flipped horizontally?
   * Cannot be reset: null is rejected.
   */
  flippedHorizontally?: boolean
  /**
   * Is this graphic flipped vertically?
   * Cannot be reset: null is rejected.
   */
  flippedVertically?: boolean
  /**
   * Color of the shadow.
   * Cannot be reset: null is rejected.
   */
  shadowColor?: Rgb
  /**
   * The 'fuzziness' of the graphic's shadow.
   * Cannot be reset: null is rejected.
   */
  shadowFuzziness?: number
  /**
   * The direction of the graphic's shadow.
   * Cannot be reset: null is rejected.
   */
  shadowVector?: Point
  /**
   * Does this graphic draw its shadow immediately beneath itself?
   * Cannot be reset: null is rejected.
   */
  shadowBeneath?: boolean
  /**
   * Color of the stroke.
   * Cannot be reset: null is rejected.
   */
  strokeColor?: Rgb
  /**
   * Type of cap at ends of the stroke.
   * Cannot be reset: null is rejected.
   */
  strokeCap?: StrokeCap
  /**
   * Type of join between segments of the stroke.
   * Cannot be reset: null is rejected.
   */
  strokeJoin?: StrokeJoin
  /**
   * Dash pattern of the stroke.
   * Cannot be reset: null is rejected.
   */
  strokePattern?: Integer
  /**
   * Thickness of the stroke.
   * Cannot be reset: null is rejected.
   */
  thickness?: number
  /**
   * Notes for this graphic.
   * Cannot be reset: null is rejected.
   */
  notes?: string
  /**
   * Name of a graphic.
   * Cannot be reset: null is rejected.
   */
  userName?: string
  /**
   * Arbitrary string tag attached to this graphic.
   * Cannot be reset: null is rejected.
   */
  tag?: string
  /**
   * Web link for this graphic.
   * Cannot be reset: null is rejected.
   */
  url?: string
  /**
   * Source of attached AppleScript.
   * Cannot be reset: null is rejected.
   */
  script?: string
  /**
   * Rank group assigned to this graphic for hierarchical layout.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * Name of the shape.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Text content.
   * Cannot be reset: null is rejected.
   */
  text?: string
  /**
   * The type of fill for this shape.
   * Cannot be reset: null is rejected.
   */
  fill?: FillType
  /**
   * The fill color.
   * Cannot be reset: null is rejected.
   */
  fillColor?: Rgb
  /**
   * For linear and radial fills, this is the ending color.
   * Cannot be reset: null is rejected.
   */
  gradientColor?: Rgb
  /**
   * Angle of a linear gradient fill.
   * Cannot be reset: null is rejected.
   */
  gradientAngle?: number
  /**
   * Rotation of the graphic in degrees.
   * Cannot be reset: null is rejected.
   */
  rotation?: number
  /**
   * Placement of the text inside the shape.
   * Cannot be reset: null is rejected.
   */
  textPlacement?: VerticalAlignment
  /**
   * Autosizing behavior of the shape around the text.
   * Cannot be reset: null is rejected.
   */
  autosizing?: TextAutosizing
  /**
   * Padding at the left and right of the text space.
   * Cannot be reset: null is rejected.
   */
  sidePadding?: Integer
  /**
   * Padding at the top and bottom of the text space.
   * Cannot be reset: null is rejected.
   */
  verticalPadding?: Integer
  /**
   * Canvas identifier for the shape.
   * Cannot be reset: null is rejected.
   */
  canvasId?: Integer
  /**
   * Shape origin.
   * Cannot be reset: null is rejected.
   */
  origin?: Point
  /**
   * Shape size.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * Type of the line.
   * Cannot be reset: null is rejected.
   */
  lineType?: LineType
  /**
   * The behavior when one line crosses over another line.
   * Cannot be reset: null is rejected.
   */
  hopType?: HopType
  /**
   * Type of line ending on the head of the line.
   * Cannot be reset: null is rejected.
   */
  headType?: string
  /**
   * Type of line ending on the tail of the line.
   * Cannot be reset: null is rejected.
   */
  tailType?: string
  /**
   * Scale of line ending on the head of the line.
   * Cannot be reset: null is rejected.
   */
  headScale?: number
  /**
   * Scale of line ending on the tail of the line.
   * Cannot be reset: null is rejected.
   */
  tailScale?: number
  /**
   * Which magnet of the destination graphic the line attaches to.
   * Cannot be reset: null is rejected.
   */
  headMagnet?: Integer
  /**
   * Which magnet of the source graphic the line attaches to.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * Rotation of the group in degrees.
   * Cannot be reset: null is rejected.
   */
  rotation?: number
  /**
   * Only connect to the group?
   * Cannot be reset: null is rejected.
   */
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
  /**
   * Layer name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Are the layer's graphics locked?
   * Cannot be reset: null is rejected.
   */
  locked?: boolean
  /**
   * Are the layer's graphics visible?
   * Cannot be reset: null is rejected.
   */
  visible?: boolean
  /**
   * Do the layer's graphics print?
   * Cannot be reset: null is rejected.
   */
  prints?: boolean
  /**
   * Canvas identifier for the layer.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * Is the subgraph collapsed?
   * Cannot be reset: null is rejected.
   */
  collapsed?: boolean
  /**
   * Top margin.
   * Cannot be reset: null is rejected.
   */
  topMargin?: number
  /**
   * Bottom margin.
   * Cannot be reset: null is rejected.
   */
  bottomMargin?: number
  /**
   * Left margin.
   * Cannot be reset: null is rejected.
   */
  leftMargin?: number
  /**
   * Right margin.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * The text inside the label.
   * Cannot be reset: null is rejected.
   */
  text?: string
  /**
   * The position along the line.
   * Cannot be reset: null is rejected.
   */
  labelPosition?: number
  /**
   * The offset from the line.
   * Cannot be reset: null is rejected.
   */
  labelOffset?: number
  /**
   * The type of rotation around the line.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * Is the grid visible?
   * Cannot be reset: null is rejected.
   */
  visible?: boolean
  /**
   * Do points snap to the grid?
   * Cannot be reset: null is rejected.
   */
  snaps?: boolean
  /**
   * Number of pixels between minor grid lines.
   * Cannot be reset: null is rejected.
   */
  spacing?: number
  /**
   * Does the grid have 'major' lines?
   * Cannot be reset: null is rejected.
   */
  major?: boolean
  /**
   * The number of minor grid lines for each major line.
   * Cannot be reset: null is rejected.
   */
  majorSpacing?: Integer
  /**
   * Does the grid draw in front of all shapes?
   * Cannot be reset: null is rejected.
   */
  drawsInFront?: boolean
  /**
   * Color of the grid.
   * Cannot be reset: null is rejected.
   */
  scriptGridColor?: Rgb
  /**
   * Color of major lines.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * Unique identifier.
   * Cannot be reset: null is rejected.
   */
  id?: string
  /**
   * Name of this master.
   * Cannot be reset: null is rejected.
   */
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
  /**
   * The type of area to be exported.
   * Cannot be reset: null is rejected.
   */
  areaType?: ExportAreaType
  /**
   * The scale to use during export.
   * Cannot be reset: null is rejected.
   */
  exportScale?: number
  /**
   * The number of pixels per point in the resulting exported image.
   * Cannot be reset: null is rejected.
   */
  resolution?: number
  /**
   * Draw the background canvas color.
   * Cannot be reset: null is rejected.
   */
  drawsBackground?: boolean
  /**
   * Whether or not to include a border area.
   * Cannot be reset: null is rejected.
   */
  includeBorder?: boolean
  /**
   * The number of pixels of border area to include.
   * Cannot be reset: null is rejected.
   */
  borderAmount?: number
  /**
   * Whether to export with non printing layers.
   * Cannot be reset: null is rejected.
   */
  includeNonprintingLayers?: boolean
  /**
   * Whether to export with artboards.
   * Cannot be reset: null is rejected.
   */
  useArtboards?: boolean
}

/** A drawing page/canvas in OmniGraffle */
export interface CanvasResourceClient {
  /** List canvases, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Canvas>>
  /**
   * Read the canvas identified by `id`.
   *
   * @param id - Canvas identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Canvas>
  /** Create a canvas. */
  create(input: CanvasCreateInput, options?: CallOptions): Promise<Canvas>
}

/** Base class for visual elements in OmniGraffle */
export interface GraphicResourceClient {
  /**
   * List graphics, as one page holding all of them.
   *
   * @param canvasId - Canvas identifier. Does not accept null.
   */
  list(canvasId: string, options?: CallOptions): Promise<Page<Graphic>>
  /**
   * Read the graphic identified by `id`.
   *
   * @param id - Graphic identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Graphic>
}

/** A shape graphic in OmniGraffle */
export interface ShapeResourceClient {
  /**
   * List shapes, as one page holding all of them.
   *
   * @param canvasId - Canvas identifier. Does not accept null.
   */
  list(canvasId: string, options?: CallOptions): Promise<Page<Shape>>
  /**
   * Read the shape identified by `id`.
   *
   * @param id - Shape identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Shape>
  /** Create a shape. */
  create(input: ShapeCreateInput, options?: CallOptions): Promise<Shape>
}

/** A line/connector in OmniGraffle */
export interface LineResourceClient {
  /**
   * List lines, as one page holding all of them.
   *
   * @param canvasId - Canvas identifier. Does not accept null.
   */
  list(canvasId: string, options?: CallOptions): Promise<Page<Line>>
  /**
   * Read the line identified by `id`.
   *
   * @param id - Line identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Line>
}

/** A drawing layer in OmniGraffle */
export interface LayerResourceClient {
  /**
   * List layers, as one page holding all of them.
   *
   * @param canvasId - Canvas identifier. Does not accept null.
   */
  list(canvasId: string, options?: CallOptions): Promise<Page<Layer>>
  /**
   * Read the layer identified by `name`.
   *
   * @param name - Layer name. Does not accept null.
   */
  get(name: string, options?: CallOptions): Promise<Layer>
  /** Create a layer. */
  create(input: LayerCreateInput, options?: CallOptions): Promise<Layer>
}

/**
 * The OmniGraffle client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link omniGraffleContract}. Its type carries the
 * contract's resource table, {@link OmniGraffleResources}, so references can be bound to it by
 * resource; the brand has no runtime member.
 */
export interface OmniGraffleClient extends ClientBrand<OmniGraffleResources> {
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
  /**
   * Draw a line between graphics
   *
   * @param from - Source graphic ID. Does not accept null.
   * @param to - Destination graphic ID. Does not accept null.
   */
  connect(from: string, to: string, options?: CallOptions): Promise<void>
  /** Layout graphics using the document's Layout Info */
  layout(options?: CallOptions): Promise<void>
  /**
   * Export documents
   *
   * @param as - File type. Does not accept null.
   * @param scope - Area to export. Does not accept null.
   * @param to - Output file path. Does not accept null.
   */
  _export(as: string, scope: ExportAreaType, to: string, options?: CallOptions): Promise<void>
  /**
   * Flip graphics
   *
   * @param over - Flip orientation. Does not accept null.
   */
  flip(over: Orientation, options?: CallOptions): Promise<void>
  /**
   * Slide graphics by a vector amount
   *
   * @param by - Vector to slide by. Does not accept null.
   */
  slide(by: Point, options?: CallOptions): Promise<void>
  /**
   * Group graphics
   *
   * @param subgraph - Create as subgraph. Does not accept null.
   */
  assemble(subgraph?: boolean, options?: CallOptions): Promise<void>
  /** Change the number of pages to fit the current graphics */
  pageAdjust(options?: CallOptions): Promise<void>
  /**
   * Evaluate JavaScript and return the result
   *
   * @param script - JavaScript code to evaluate. Does not accept null.
   */
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
    name: t.nullable(t.string(), { description: 'Name of this canvas' }),
    adjustsPages: t.nullable(t.boolean(), {
      description: 'Adjust number of pages on the canvas automatically?',
    }),
    canvasSizeIsMeasuredInPages: t.nullable(t.boolean(), {
      description: 'Whether canvas size is reported as multiples of page size',
    }),
    canvasSize: t.nullable(t.point(), {
      description: 'Size of the canvas (page size multiplied by number of pages)',
    }),
    pageSize: t.nullable(t.point(), { description: 'Size of each page' }),
    horizontalPages: t.nullable(t.integer(), { description: 'Horizontal pages' }),
    verticalPages: t.nullable(t.integer(), { description: 'Vertical pages' }),
    columnAlignment: t.nullable(t.enumeration(horizontalAlignmentMembers), {
      description: 'Column alignment',
    }),
    rowAlignment: t.nullable(t.enumeration(verticalAlignmentMembers), {
      description: 'Row alignment',
    }),
    columnSpacing: t.nullable(t.double(), { description: 'Spacing between graphics in a column' }),
    rowSpacing: t.nullable(t.double(), { description: 'Spacing between graphics in a row' }),
  },
  { description: 'A drawing page/canvas in OmniGraffle' }
)

const graphicRecordType: ValueType<Graphic> = t.record(
  {
    id: t.string({ description: 'Unique identifier' }),
    origin: t.nullable(t.point(), {
      description:
        'Origin of the graphic (position of the upper-left corner of the bounding rectangle)',
    }),
    size: t.nullable(t.point(), {
      description: 'Size of the graphic (width and height of the bounding rectangle)',
    }),
    locked: t.nullable(t.boolean(), { description: 'Is this graphic locked?' }),
    allowsConnections: t.nullable(t.boolean(), {
      description: 'Does this graphic allow connections to it?',
    }),
    alignsEdgesToGrid: t.nullable(t.boolean(), {
      description: 'When snapped to the grid does this graphic align its edges to the grid?',
    }),
    cornerRadius: t.nullable(t.double(), {
      description: 'Curvature of corners in the stroke path',
    }),
    drawsShadow: t.nullable(t.boolean(), { description: 'Does this graphic draw its shadow?' }),
    drawsStroke: t.nullable(t.boolean(), { description: 'Does this graphic draw its stroke?' }),
    doubleStroke: t.nullable(t.boolean(), {
      description: 'Does this graphic have a double-lined stroke?',
    }),
    flippedHorizontally: t.nullable(t.boolean(), {
      description: 'Is this graphic flipped horizontally?',
    }),
    flippedVertically: t.nullable(t.boolean(), {
      description: 'Is this graphic flipped vertically?',
    }),
    shadowColor: t.nullable(t.rgb(), { description: 'Color of the shadow' }),
    shadowFuzziness: t.nullable(t.double(), {
      description: "The 'fuzziness' of the graphic's shadow",
    }),
    shadowVector: t.nullable(t.point(), { description: "The direction of the graphic's shadow" }),
    shadowBeneath: t.nullable(t.boolean(), {
      description: 'Does this graphic draw its shadow immediately beneath itself?',
    }),
    strokeColor: t.nullable(t.rgb(), { description: 'Color of the stroke' }),
    strokeCap: t.nullable(t.enumeration(strokeCapMembers), {
      description: 'Type of cap at ends of the stroke',
    }),
    strokeJoin: t.nullable(t.enumeration(strokeJoinMembers), {
      description: 'Type of join between segments of the stroke',
    }),
    strokePattern: t.nullable(t.integer(), { description: 'Dash pattern of the stroke' }),
    thickness: t.nullable(t.double(), { description: 'Thickness of the stroke' }),
    notes: t.nullable(t.string(), { description: 'Notes for this graphic' }),
    userName: t.nullable(t.string(), { description: 'Name of a graphic' }),
    tag: t.nullable(t.string(), { description: 'Arbitrary string tag attached to this graphic' }),
    url: t.nullable(t.string(), { description: 'Web link for this graphic' }),
    script: t.nullable(t.string(), { description: 'Source of attached AppleScript' }),
    rankGroup: t.nullable(t.integer(), {
      description: 'Rank group assigned to this graphic for hierarchical layout',
    }),
  },
  { description: 'Base class for visual elements in OmniGraffle' }
)

const shapeRecordType: ValueType<Shape> = t.record(
  {
    id: t.string({ description: 'Unique identifier' }),
    name: t.nullable(t.string(), { description: 'Name of the shape' }),
    text: t.nullable(t.string(), { description: 'The text inside the shape' }),
    fill: t.nullable(t.enumeration(fillTypeMembers), {
      description: 'The type of fill for this shape',
    }),
    fillColor: t.nullable(t.rgb(), { description: 'The fill color' }),
    gradientColor: t.nullable(t.rgb(), {
      description: 'For linear and radial fills, this is the ending color',
    }),
    gradientAngle: t.nullable(t.double(), { description: 'Angle of a linear gradient fill' }),
    rotation: t.nullable(t.double(), { description: 'Rotation of the graphic in degrees' }),
    textPlacement: t.nullable(t.enumeration(verticalAlignmentMembers), {
      description: 'Placement of the text inside the shape',
    }),
    autosizing: t.nullable(t.enumeration(textAutosizingMembers), {
      description: 'Autosizing behavior of the shape around the text',
    }),
    sidePadding: t.nullable(t.integer(), {
      description: 'Padding at the left and right of the text space',
    }),
    verticalPadding: t.nullable(t.integer(), {
      description: 'Padding at the top and bottom of the text space',
    }),
  },
  { description: 'A shape graphic in OmniGraffle' }
)

const lineRecordType: ValueType<Line> = t.record(
  {
    id: t.string({ description: 'Unique identifier' }),
    lineType: t.nullable(t.enumeration(lineTypeMembers), { description: 'Type of the line' }),
    hopType: t.nullable(t.enumeration(hopTypeMembers), {
      description: 'The behavior when one line crosses over another line',
    }),
    headType: t.nullable(t.string(), {
      description: 'Type of line ending on the head of the line',
    }),
    tailType: t.nullable(t.string(), {
      description: 'Type of line ending on the tail of the line',
    }),
    headScale: t.nullable(t.double(), {
      description: 'Scale of line ending on the head of the line',
    }),
    tailScale: t.nullable(t.double(), {
      description: 'Scale of line ending on the tail of the line',
    }),
    headMagnet: t.nullable(t.integer(), {
      description: 'Which magnet of the destination graphic the line attaches to',
    }),
    tailMagnet: t.nullable(t.integer(), {
      description: 'Which magnet of the source graphic the line attaches to',
    }),
  },
  { description: 'A line/connector in OmniGraffle' }
)

const layerRecordType: ValueType<Layer> = t.record(
  {
    name: t.string({ description: 'Name of the layer' }),
    locked: t.nullable(t.boolean(), { description: "Are the layer's graphics locked?" }),
    visible: t.nullable(t.boolean(), { description: "Are the layer's graphics visible?" }),
    prints: t.nullable(t.boolean(), { description: "Do the layer's graphics print?" }),
  },
  { description: 'A drawing layer in OmniGraffle' }
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
 * The type of the resource table of {@link omniGraffleContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for a resource the app finds only within another,
 * that parent resource. A client created from the contract carries it, so
 * `bindReference` admits only references the contract can resolve.
 */
export type OmniGraffleResources = Readonly<{
  Canvas: ResourceDescriptor<Canvas, string> & {
    readonly id: ValueType<string>
    readonly get: 'omnigraffle.canvases.get'
    readonly list: 'omnigraffle.canvases.list'
  }
  Graphic: ResourceDescriptor<Graphic, string> & {
    readonly id: ValueType<string>
    readonly get: 'omnigraffle.graphics.get'
    readonly list: 'omnigraffle.graphics.list'
  }
  Shape: ResourceDescriptor<Shape, string> & {
    readonly id: ValueType<string>
    readonly get: 'omnigraffle.shapes.get'
    readonly list: 'omnigraffle.shapes.list'
  }
  Line: ResourceDescriptor<Line, string> & {
    readonly id: ValueType<string>
    readonly get: 'omnigraffle.lines.get'
    readonly list: 'omnigraffle.lines.list'
  }
  Layer: ResourceDescriptor<Layer, string> & {
    readonly id: ValueType<string>
    readonly get: 'omnigraffle.layers.get'
    readonly list: 'omnigraffle.layers.list'
  }
}>

/**
 * The resource table: the implementation of {@link OmniGraffleResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {
  Canvas: {
    name: 'Canvas',
    record: canvasRecordType,
    id: t.string({ description: 'Unique identifier' }),
    get: 'omnigraffle.canvases.get',
    list: 'omnigraffle.canvases.list',
  },
  Graphic: {
    name: 'Graphic',
    record: graphicRecordType,
    id: t.string({ description: 'Unique identifier' }),
    get: 'omnigraffle.graphics.get',
    list: 'omnigraffle.graphics.list',
  },
  Shape: {
    name: 'Shape',
    record: shapeRecordType,
    id: t.string({ description: 'Unique identifier' }),
    get: 'omnigraffle.shapes.get',
    list: 'omnigraffle.shapes.list',
  },
  Line: {
    name: 'Line',
    record: lineRecordType,
    id: t.string({ description: 'Unique identifier' }),
    get: 'omnigraffle.lines.get',
    list: 'omnigraffle.lines.list',
  },
  Layer: {
    name: 'Layer',
    record: layerRecordType,
    id: t.string({ description: 'Name of the layer' }),
    get: 'omnigraffle.layers.get',
    list: 'omnigraffle.layers.list',
  },
} satisfies OmniGraffleResources

const canvasListCanvasesOperation: OperationDescriptor<Record<string, never>, Page<Canvas>> = {
  id: 'omnigraffle.canvases.list',
  permission: 'omnigraffle:canvases:list',
  target: { command: 'listCanvases', resource: 'Canvas' },
  description: 'List all canvases',
  input: t.record({}),
  output: t.page(canvasRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const canvasGetCanvasOperation: OperationDescriptor<{ readonly id: string }, Canvas> = {
  id: 'omnigraffle.canvases.get',
  permission: 'omnigraffle:canvases:get',
  target: { command: 'getCanvas', resource: 'Canvas' },
  description: 'Get a canvas by ID',
  input: t.record({
    id: t.string({ description: 'Canvas identifier' }),
  }),
  output: canvasRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Canvas identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const canvasCreateCanvasOperation: OperationDescriptor<CanvasCreateInput, Canvas> = {
  id: 'omnigraffle.canvases.create',
  permission: 'omnigraffle:canvases:create',
  target: { command: 'createCanvas', resource: 'Canvas' },
  description: 'Create a new canvas',
  input: canvasCreateInputType,
  output: canvasRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Unique identifier' },
      name: { type: 'string', description: 'Canvas name' },
      adjustsPages: {
        type: 'boolean',
        description: 'Adjust number of pages on the canvas automatically?',
      },
      canvasSizeIsMeasuredInPages: {
        type: 'boolean',
        description: 'Whether canvas size is reported as multiples of page size',
      },
      canvasSize: {
        type: 'object',
        properties: {
          x: {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          y: {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
        },
        required: ['x', 'y'],
        additionalProperties: false,
        description: 'Size of the canvas (page size multiplied by number of pages)',
      },
      horizontalPages: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'Horizontal pages',
      },
      verticalPages: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'Vertical pages',
      },
      columnAlignment: {
        type: 'string',
        enum: ['left', 'center', 'right'],
        description: 'Column alignment',
      },
      rowAlignment: {
        type: 'string',
        enum: ['top', 'center', 'bottom'],
        description: 'Row alignment',
      },
      columnSpacing: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'Spacing between graphics in a column',
      },
      rowSpacing: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'Spacing between graphics in a row',
      },
    },
    required: ['name'],
    additionalProperties: false,
  },
}

const graphicListGraphicsOperation: OperationDescriptor<
  { readonly canvasId: string },
  Page<Graphic>
> = {
  id: 'omnigraffle.graphics.list',
  permission: 'omnigraffle:graphics:list',
  target: { command: 'listGraphics', resource: 'Graphic' },
  description: 'List all graphics on a canvas',
  input: t.record({
    canvasId: t.string({ description: 'Canvas identifier' }),
  }),
  output: t.page(graphicRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { canvasId: { type: 'string', description: 'Canvas identifier' } },
    required: ['canvasId'],
    additionalProperties: false,
  },
}

const graphicGetGraphicOperation: OperationDescriptor<{ readonly id: string }, Graphic> = {
  id: 'omnigraffle.graphics.get',
  permission: 'omnigraffle:graphics:get',
  target: { command: 'getGraphic', resource: 'Graphic' },
  description: 'Get a graphic by ID',
  input: t.record({
    id: t.string({ description: 'Graphic identifier' }),
  }),
  output: graphicRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Graphic identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const shapeListShapesOperation: OperationDescriptor<{ readonly canvasId: string }, Page<Shape>> = {
  id: 'omnigraffle.shapes.list',
  permission: 'omnigraffle:shapes:list',
  target: { command: 'listShapes', resource: 'Shape' },
  description: 'List all shapes on a canvas',
  input: t.record({
    canvasId: t.string({ description: 'Canvas identifier' }),
  }),
  output: t.page(shapeRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { canvasId: { type: 'string', description: 'Canvas identifier' } },
    required: ['canvasId'],
    additionalProperties: false,
  },
}

const shapeGetShapeOperation: OperationDescriptor<{ readonly id: string }, Shape> = {
  id: 'omnigraffle.shapes.get',
  permission: 'omnigraffle:shapes:get',
  target: { command: 'getShape', resource: 'Shape' },
  description: 'Get a shape by ID',
  input: t.record({
    id: t.string({ description: 'Shape identifier' }),
  }),
  output: shapeRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Shape identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const shapeCreateShapeOperation: OperationDescriptor<ShapeCreateInput, Shape> = {
  id: 'omnigraffle.shapes.create',
  permission: 'omnigraffle:shapes:create',
  target: { command: 'createShape', resource: 'Shape' },
  description: 'Create a new shape',
  input: shapeCreateInputType,
  output: shapeRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name of the shape' },
      text: { type: 'string', description: 'Text content' },
      fill: {
        type: 'string',
        enum: ['noFill', 'solidFill', 'linearFill', 'radialFill'],
        description: 'The type of fill for this shape',
      },
      fillColor: {
        type: 'object',
        properties: {
          r: {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          g: {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          b: {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
        },
        required: ['r', 'g', 'b'],
        additionalProperties: false,
        description: 'The fill color',
      },
      gradientColor: {
        type: 'object',
        properties: {
          r: {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          g: {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          b: {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
        },
        required: ['r', 'g', 'b'],
        additionalProperties: false,
        description: 'For linear and radial fills, this is the ending color',
      },
      gradientAngle: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'Angle of a linear gradient fill',
      },
      rotation: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'Rotation of the graphic in degrees',
      },
      textPlacement: {
        type: 'string',
        enum: ['top', 'center', 'bottom'],
        description: 'Placement of the text inside the shape',
      },
      autosizing: {
        type: 'string',
        enum: ['overflow', 'full', 'verticallyOnly', 'clip'],
        description: 'Autosizing behavior of the shape around the text',
      },
      sidePadding: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'Padding at the left and right of the text space',
      },
      verticalPadding: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'Padding at the top and bottom of the text space',
      },
      canvasId: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'Canvas identifier for the shape',
      },
      origin: {
        type: 'object',
        properties: {
          x: {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          y: {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
        },
        required: ['x', 'y'],
        additionalProperties: false,
        description: 'Shape origin',
      },
      size: {
        type: 'object',
        properties: {
          x: {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          y: {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
        },
        required: ['x', 'y'],
        additionalProperties: false,
        description: 'Shape size',
      },
    },
    required: ['canvasId', 'origin', 'size'],
    additionalProperties: false,
  },
}

const lineListLinesOperation: OperationDescriptor<{ readonly canvasId: string }, Page<Line>> = {
  id: 'omnigraffle.lines.list',
  permission: 'omnigraffle:lines:list',
  target: { command: 'listLines', resource: 'Line' },
  description: 'List all lines on a canvas',
  input: t.record({
    canvasId: t.string({ description: 'Canvas identifier' }),
  }),
  output: t.page(lineRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { canvasId: { type: 'string', description: 'Canvas identifier' } },
    required: ['canvasId'],
    additionalProperties: false,
  },
}

const lineGetLineOperation: OperationDescriptor<{ readonly id: string }, Line> = {
  id: 'omnigraffle.lines.get',
  permission: 'omnigraffle:lines:get',
  target: { command: 'getLine', resource: 'Line' },
  description: 'Get a line by ID',
  input: t.record({
    id: t.string({ description: 'Line identifier' }),
  }),
  output: lineRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Line identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const layerListLayersOperation: OperationDescriptor<{ readonly canvasId: string }, Page<Layer>> = {
  id: 'omnigraffle.layers.list',
  permission: 'omnigraffle:layers:list',
  target: { command: 'listLayers', resource: 'Layer' },
  description: 'List all layers on a canvas',
  input: t.record({
    canvasId: t.string({ description: 'Canvas identifier' }),
  }),
  output: t.page(layerRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { canvasId: { type: 'string', description: 'Canvas identifier' } },
    required: ['canvasId'],
    additionalProperties: false,
  },
}

const layerGetLayerOperation: OperationDescriptor<{ readonly name: string }, Layer> = {
  id: 'omnigraffle.layers.get',
  permission: 'omnigraffle:layers:get',
  target: { command: 'getLayer', resource: 'Layer' },
  description: 'Get a layer by name',
  input: t.record({
    name: t.string({ description: 'Layer name' }),
  }),
  output: layerRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { name: { type: 'string', description: 'Layer name' } },
    required: ['name'],
    additionalProperties: false,
  },
}

const layerCreateLayerOperation: OperationDescriptor<LayerCreateInput, Layer> = {
  id: 'omnigraffle.layers.create',
  permission: 'omnigraffle:layers:create',
  target: { command: 'createLayer', resource: 'Layer' },
  description: 'Create a new layer',
  input: layerCreateInputType,
  output: layerRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Layer name' },
      locked: { type: 'boolean', description: "Are the layer's graphics locked?" },
      visible: { type: 'boolean', description: "Are the layer's graphics visible?" },
      prints: { type: 'boolean', description: "Do the layer's graphics print?" },
      canvasId: { type: 'string', description: 'Canvas identifier for the layer' },
    },
    required: ['name', 'canvasId'],
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      from: { type: 'string', description: 'Source graphic ID' },
      to: { type: 'string', description: 'Destination graphic ID' },
    },
    required: ['from', 'to'],
    additionalProperties: false,
  },
}

const appLayoutOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omnigraffle.app.layout',
  permission: 'omnigraffle:app:layout',
  target: { command: 'layout' },
  description: "Layout graphics using the document's Layout Info",
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      as: { type: 'string', description: 'File type' },
      scope: {
        type: 'string',
        enum: ['selectedGraphics', 'allGraphics', 'currentCanvas', 'entireDocument'],
        description: 'Area to export',
      },
      to: { type: 'string', description: 'Output file path' },
    },
    required: ['as', 'scope', 'to'],
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      over: {
        type: 'string',
        enum: ['horizontally', 'vertically'],
        description: 'Flip orientation',
      },
    },
    required: ['over'],
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      by: {
        type: 'object',
        properties: {
          x: {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          y: {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
        },
        required: ['x', 'y'],
        additionalProperties: false,
        description: 'Vector to slide by',
      },
    },
    required: ['by'],
    additionalProperties: false,
  },
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { subgraph: { type: 'boolean', description: 'Create as subgraph' } },
    additionalProperties: false,
  },
}

const appPageAdjustOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omnigraffle.app.pageAdjust',
  permission: 'omnigraffle:app:pageAdjust',
  target: { command: 'pageAdjust' },
  description: 'Change the number of pages to fit the current graphics',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
    inputJsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: { script: { type: 'string', description: 'JavaScript code to evaluate' } },
      required: ['script'],
      additionalProperties: false,
    },
  }

/** Every operation, keyed by its identity. */
const operations: AppContract<OmniGraffleClient>['operations'] = {
  'omnigraffle.canvases.list': canvasListCanvasesOperation,
  'omnigraffle.canvases.get': canvasGetCanvasOperation,
  'omnigraffle.canvases.create': canvasCreateCanvasOperation,
  'omnigraffle.graphics.list': graphicListGraphicsOperation,
  'omnigraffle.graphics.get': graphicGetGraphicOperation,
  'omnigraffle.shapes.list': shapeListShapesOperation,
  'omnigraffle.shapes.get': shapeGetShapeOperation,
  'omnigraffle.shapes.create': shapeCreateShapeOperation,
  'omnigraffle.lines.list': lineListLinesOperation,
  'omnigraffle.lines.get': lineGetLineOperation,
  'omnigraffle.layers.list': layerListLayersOperation,
  'omnigraffle.layers.get': layerGetLayerOperation,
  'omnigraffle.layers.create': layerCreateLayerOperation,
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
export const omniGraffleContract: AppContract<OmniGraffleClient, OmniGraffleResources> = {
  app: 'omnigraffle',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
