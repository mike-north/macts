/**
 * The SDK integer type and its accepted domain.
 *
 * Integers are ordinary JavaScript numbers at runtime, branded so that a plain
 * `number` cannot be written where an integer is required. A value acquires the
 * brand only through validation (or an explicitly chosen rounding/truncation
 * strategy), and values read from an operation carry it already. The domain is
 * the safe-integer range: every member is exactly representable as a number, so
 * the decimal wire form never claims precision a number cannot hold.
 *
 * There is no implicit clamping, rounding, or truncation anywhere: a value that
 * is fractional, non-finite, or outside the domain is rejected. A caller that
 * holds such a value chooses a strategy explicitly with the `Integer`
 * helpers (`Integer.validate`, `Integer.round`, or `Integer.truncate`). Casting
 * a `number` to `Integer` is not a conversion: it skips the check that the
 * runtime then repeats, so the value is rejected later and further from the
 * mistake.
 *
 * @packageDocumentation
 */

/**
 * Type-level key of the integer brand. Declared, never defined: it has no
 * runtime existence and is deliberately not exported, so the brand cannot be
 * named (or forged) outside this module except by a cast.
 */
declare const integerBrand: unique symbol

/**
 * A finite integral number inside {@link INTEGER_LIMITS}.
 *
 * @remarks
 * `Integer` is assignable to `number`, so arithmetic and comparisons work as
 * usual, but `number` is not assignable to `Integer`. To turn a `number` into
 * an `Integer`, use `Integer.validate(n)` (rejects anything that is not
 * already an integer), `Integer.round(n)` (rounds half away from zero), or
 * `Integer.truncate(n)` (drops the fraction). Do not cast: a cast does not
 * convert, and the value is still validated, and rejected, at runtime. An
 * integer has no signed zero: `-0` is accepted and encodes as `0`.
 *
 * The brand's literal repeats those helper names, so the compiler's own
 * diagnostic for a plain `number` names the fix even without a hover.
 *
 * @see {@link (Integer:variable)} for the conversion helpers.
 */
export type Integer = number & {
  readonly [integerBrand]: 'Integer: convert with Integer.validate(n), Integer.round(n), or Integer.truncate(n)'
}

/**
 * Inclusive bounds of the SDK integer domain: the safe integers.
 *
 * @remarks
 * Values outside these bounds are rejected rather than clamped or rounded, in
 * both directions across the wire and at the native boundary. An app may
 * declare narrower bounds of its own; it can never widen these.
 */
export const INTEGER_LIMITS: Readonly<{ min: number; max: number }> = Object.freeze({
  min: Number.MIN_SAFE_INTEGER,
  max: Number.MAX_SAFE_INTEGER,
})

/**
 * Validation and explicit conversion into {@link (Integer:type)}.
 *
 * @remarks
 * Each helper either returns a valid integer or throws. None of them clamps:
 * a value outside {@link INTEGER_LIMITS} is always rejected, even after
 * rounding or truncation.
 */
export interface IntegerHelpers {
  /**
   * Whether `value` is an integer: a finite, integral number within
   * {@link INTEGER_LIMITS}. `-0` qualifies.
   */
  is(value: unknown): value is Integer
  /**
   * Return `value` as an {@link (Integer:type)}, or throw if it is not one.
   *
   * @remarks
   * Nothing is rounded or truncated: a fractional number is rejected. `-0`
   * becomes `0`.
   *
   * @throws `RangeError` when `value` is not finite, not integral, or outside
   * {@link INTEGER_LIMITS}; the message says which and names the explicit
   * conversions. `TypeError` when `value` is not a number at all.
   */
  validate(value: number): Integer
  /**
   * Round `value` to the nearest integer, with halves rounded away from zero
   * (`2.5` → `3`, `-2.5` → `-3`), then validate it.
   *
   * @remarks
   * This is deliberately not `Math.round`, which rounds halves toward positive
   * infinity and so treats negative values asymmetrically (`Math.round(-2.5)`
   * is `-2`). The result is never `-0`.
   *
   * @throws `RangeError` when `value` is not finite or the rounded value is
   * outside {@link INTEGER_LIMITS}. `TypeError` when `value` is not a number.
   */
  round(value: number): Integer
  /**
   * Drop the fractional part of `value` (round toward zero: `2.9` → `2`,
   * `-2.9` → `-2`), then validate it. The result is never `-0`.
   *
   * @throws `RangeError` when `value` is not finite or the truncated value is
   * outside {@link INTEGER_LIMITS}. `TypeError` when `value` is not a number.
   */
  truncate(value: number): Integer
}

/**
 * Helpers that produce {@link (Integer:type)} values. The value shares its name with
 * the type, so the conversions are found exactly where a type error names
 * `Integer`.
 *
 * @example
 * ```ts
 * setCount(Integer.validate(count)) // count must already be an integer
 * setCount(Integer.round(average)) // or choose a conversion explicitly
 * ```
 */
export const Integer: IntegerHelpers = Object.freeze({
  is: isInteger,
  validate(value: number): Integer {
    return convert('Integer.validate', value, (n) => n)
  },
  round(value: number): Integer {
    return convert('Integer.round', value, roundHalfAwayFromZero)
  },
  truncate(value: number): Integer {
    return convert('Integer.truncate', value, Math.trunc)
  },
})

function isInteger(value: unknown): value is Integer {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= INTEGER_LIMITS.min &&
    value <= INTEGER_LIMITS.max
  )
}

/**
 * Round half away from zero. Rounding the magnitude with `Math.round` is exact
 * for non-negative inputs (where ties toward +∞ and away from zero agree), and
 * restoring the sign makes negative ties symmetric.
 */
function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value))
}

/**
 * Apply `strategy` to `input` and return the result (with `-0` normalized to
 * `0`) as an integer, or throw an error that names the helper and the caller's
 * original input. `input` is `unknown` because callers can bypass the static
 * `number` parameter type.
 */
function convert(helper: string, input: unknown, strategy: (value: number) => number): Integer {
  if (typeof input !== 'number') {
    throw new TypeError(`${helper} expects a number; received ${describeNonNumber(input)}.`)
  }
  const candidate = strategy(input)
  const normalized = candidate === 0 ? 0 : candidate
  if (isInteger(normalized)) return normalized

  const rendered = Object.is(input, -0) ? '-0' : String(input)
  const prefix = `${helper}(${rendered}): `
  const hint = helper === 'Integer.validate' ? VALIDATE_HINT : ''
  if (!Number.isFinite(normalized)) {
    throw new RangeError(`${prefix}${rendered} is not finite, so it has no integer value.${hint}`)
  }
  if (!Number.isInteger(normalized)) {
    throw new RangeError(`${prefix}${rendered} is not integral (it has a fractional part).${hint}`)
  }
  throw new RangeError(
    `${prefix}${String(normalized)} is outside the integer range ` +
      `${String(INTEGER_LIMITS.min)}..${String(INTEGER_LIMITS.max)} (the safe integers), ` +
      `and integers are never clamped.${hint}`
  )
}

/** Appended to every `Integer.validate` failure, so the reader learns the explicit conversions. */
const VALIDATE_HINT =
  ' Integers are never rounded, truncated, or clamped implicitly: convert explicitly with ' +
  'Integer.round(value) (half away from zero) or Integer.truncate(value) (toward zero).'

function describeNonNumber(value: unknown): string {
  if (typeof value === 'string') return `the string ${JSON.stringify(value)}`
  if (typeof value === 'bigint') return `the bigint ${value.toString()}n`
  return value === null ? 'null' : typeof value
}
