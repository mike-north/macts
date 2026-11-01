/**
 * The native value codec interface: conversion between wire values and native
 * automation values, performed inside the automation process itself.
 *
 * Numeric classification, non-finite values, negative zero, and dates are lost
 * if a native result is serialized with plain `JSON.stringify` inside the
 * automation process. The codec therefore runs there, before serialization:
 * the executor embeds the codec's source, the wire input, and the input and
 * output value plans in the script it runs. Inside the process, `decode`
 * converts the wire input into native arguments and `encode` converts the
 * native result into wire form.
 *
 * This module defines only the contract between the codec, which knows value
 * conversion, and the executor, which knows process execution and failure
 * classification. Neither re-implements the other.
 *
 * @packageDocumentation
 */

import type { IssuePath, ValuePlan, WireRecord, WireValue } from '@macts/contracts'

/**
 * Name of the top-level function a {@link NativeCodec} prelude defines to turn
 * wire values into native values: `(wire, plan) => native`.
 */
export const NATIVE_DECODE_FUNCTION = '__mactsDecode'

/**
 * Name of the top-level function a {@link NativeCodec} prelude defines to turn
 * native values into JSON-safe wire values: `(native, plan) => wire`.
 */
export const NATIVE_ENCODE_FUNCTION = '__mactsEncode'

/**
 * Marker `name` of the objects a codec function throws when a value violates
 * its plan. The executor uses it to tell codec failures from app failures.
 */
export const NATIVE_CODEC_ERROR_NAME = 'MactsCodecError'

/**
 * Source for the in-process value codec.
 *
 * @remarks
 * `prelude` is automation-process JavaScript that defines exactly the two
 * top-level functions {@link NATIVE_DECODE_FUNCTION} and
 * {@link NATIVE_ENCODE_FUNCTION}, and no other globals. Their contract:
 *
 * - `decode(wire, plan)` returns native values: dates as `Date`, integer text as
 *   numbers, special double states as `NaN`, `±Infinity`, or `-0`, and
 *   app-specific bridge forms where the plan calls for them.
 * - `encode(native, plan)` returns JSON-safe wire values: no raw `NaN`,
 *   `Infinity`, or `-0`, no `Date` objects, and no own properties holding
 *   `undefined`. Absent optional fields are omitted.
 * - Under a `passthrough` plan, both functions return their argument
 *   unchanged.
 * - When a value violates the plan, either function throws an object whose
 *   `name` is {@link NATIVE_CODEC_ERROR_NAME} and which also carries
 *   `direction`, `path`, and `message`. Examples are a fractional value at an
 *   integer position, or an integer outside the supported domain.
 */
export interface NativeCodec {
  /** In-process JavaScript defining the decode and encode functions. */
  readonly prelude: string
}

/**
 * One native invocation, expressed without interpolating any value into source
 * text.
 *
 * @remarks
 * `body` is a function body invoked as `(app, args)`, where `app` is the target
 * application and `args` is the decoded input record. The executor composes the
 * script as: codec prelude, then decode of `input` against `inputPlan`, then
 * `body`, then encode of its result against `outputPlan`, all inside one
 * try/catch that yields a {@link NativeOutcome}.
 */
export interface NativeScript {
  /** Bundle identifier of the target application. */
  readonly bundleId: string
  /** Function body run as `(app, args)`. */
  readonly body: string
  /** Validated wire input record (plain JSON under a passthrough plan). */
  readonly input: WireRecord
  /** Plan for decoding `input` into native arguments. */
  readonly inputPlan: ValuePlan
  /** Plan for encoding the native result into wire form. */
  readonly outputPlan: ValuePlan
}

/**
 * Why a native invocation did not produce a wire value.
 *
 * @remarks
 * - `app`: the application or the automation bridge raised an error.
 *   `errorNumber` is the bridge's numeric error code when one was provided; the
 *   executor maps it to a canonical structured error.
 * - `codec`: a value violated its plan. On `encode` this means the app returned
 *   something the contract does not allow; on `decode` it means a bridge form
 *   could not be produced from already-validated input.
 */
export type NativeFailure =
  | { readonly source: 'app'; readonly message: string; readonly errorNumber?: number }
  | {
      readonly source: 'codec'
      readonly direction: 'decode' | 'encode'
      readonly path: IssuePath
      readonly message: string
    }

/** What the automation process reports for one {@link NativeScript}. */
export type NativeOutcome =
  | { readonly ok: true; readonly value: WireValue }
  | { readonly ok: false; readonly failure: NativeFailure }
