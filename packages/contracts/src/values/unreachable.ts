/**
 * Exhaustiveness enforcement for closed unions such as dictionary enums.
 *
 * @packageDocumentation
 */

/**
 * Thrown when control reaches a branch that the static types say cannot be
 * reached, for example the `default` case of an exhaustive `switch` over a
 * closed enum.
 *
 * @remarks
 * The constructor accepts only `never`. Passing the switched-on value in a
 * `default` branch therefore compiles only while every member is handled, so
 * adding a member turns each unhandled switch into a compile error. At runtime
 * (for example after an unchecked cast), the error reports the unexpected value
 * so the failure is actionable.
 *
 * This is a caller-side programming error, not an operation outcome. It is not
 * part of the structured error family and never crosses the wire.
 *
 * @example
 * ```ts
 * switch (status) {
 *   case 'confirmed':
 *   case 'tentative':
 *     return true
 *   case 'cancelled':
 *     return false
 *   default:
 *     throw new UnreachableError(status, 'event status')
 * }
 * ```
 */
export class UnreachableError extends Error {
  override readonly name = 'UnreachableError'

  /** The value that no branch handled. */
  readonly value: unknown

  /**
   * @param value - The value that should have been impossible. Typed `never`
   *   so that unhandled union members are compile errors.
   * @param context - Optional description of what was being handled, used in
   *   the message (for example `'event status'`).
   */
  constructor(value: never, context?: string) {
    const subject = context === undefined ? '' : ` for ${context}`
    super(
      `Unexpected value ${describeValue(value)}${subject}: no case handles it. ` +
        'It may come from a newer app version or from data that bypassed validation.'
    )
    this.value = value
  }
}

/** Render an arbitrary value for an error message without throwing. */
function describeValue(value: unknown): string {
  switch (typeof value) {
    case 'number':
      return Object.is(value, -0) ? '-0' : String(value)
    case 'bigint':
      return `${value.toString()}n`
    case 'symbol':
      return value.toString()
    case 'function':
      return '[function]'
    case 'undefined':
      return 'undefined'
    default:
      try {
        return JSON.stringify(value)
      } catch {
        return '[unserializable value]'
      }
  }
}
