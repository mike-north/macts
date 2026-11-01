/**
 * Two-dimensional geometry values.
 *
 * Geometry members are doubles: on the wire each member is a numeric control
 * record, while SDK values are plain numbers. These types impose no positivity,
 * integrality, origin, or unit; each app contract supplies those where they
 * apply. A future three-dimensional need gets its own named type rather than an
 * extra member here.
 *
 * @packageDocumentation
 */

/** A location in a two-dimensional coordinate space defined by the app. */
export interface Point {
  /** Horizontal coordinate. */
  readonly x: number
  /** Vertical coordinate. */
  readonly y: number
}

/** An axis-aligned rectangle in a coordinate space defined by the app. */
export interface Rectangle {
  /** Horizontal coordinate of the rectangle's origin. */
  readonly x: number
  /** Vertical coordinate of the rectangle's origin. */
  readonly y: number
  /** Horizontal extent. */
  readonly width: number
  /** Vertical extent. */
  readonly height: number
}
