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
 * usual, but `number` is not assignable to `Integer`. Produce one with the
 * integer helpers (validate, round, or truncate) rather than a cast. An
 * integer has no signed zero: `-0` is accepted and encodes as `0`.
 */
export type Integer = number & { readonly [integerBrand]: 'Integer' }

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
