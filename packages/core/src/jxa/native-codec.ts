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
 * This module defines the contract between the codec, which knows value
 * conversion, and the executor, which knows process execution and failure
 * classification, and it exports the codec implementation,
 * {@link NATIVE_CODEC}. Neither side re-implements the other.
 *
 * @packageDocumentation
 */

import type { IssuePath, ValuePlan, WireRecord, WireValue } from '@macts/contracts'
import { createNativeCodecFunctions } from './native-codec-functions.js'

/**
 * Name of the top-level function a {@link NativeCodec} prelude defines to turn
 * wire values into native values: `(wire, plan, env) => native`.
 */
export const NATIVE_DECODE_FUNCTION = '__mactsDecode'

/**
 * Name of the top-level function a {@link NativeCodec} prelude defines to turn
 * native values into JSON-safe wire values: `(native, plan, env) => wire`.
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
 * `prelude` is automation-process JavaScript that declares exactly two
 * top-level bindings, {@link NATIVE_DECODE_FUNCTION} and
 * {@link NATIVE_ENCODE_FUNCTION}, both holding functions, and defines no other
 * globals. Their contract:
 *
 * - `decode(wire, plan, env)` returns native values: dates as `Date`, integer
 *   text as numbers, special double states as `NaN`, `±Infinity`, or `-0`,
 *   app-specific bridge forms where the plan calls for them, and the app's own
 *   object for a reference it can address ({@link NativeCodecEnvironment}).
 * - `encode(native, plan, env)` returns JSON-safe wire values: no raw `NaN`,
 *   `Infinity`, or `-0`, no `Date` objects, and no own properties holding
 *   `undefined`. Absent optional fields are omitted. An app object at a
 *   reference position becomes an identity reference.
 * - `env` is `{ app, references }`. Without it, no reference converts.
 * - Under a `passthrough` plan, both functions return their argument
 *   unchanged.
 * - Under a `none` plan, `encode` returns `null` whatever the native result
 *   was, and `decode` returns `undefined`.
 * - When a value violates the plan, either function throws an object whose
 *   `name` is {@link NATIVE_CODEC_ERROR_NAME} and which also carries
 *   `direction`, `path`, and `message`. Examples are a fractional value at an
 *   integer position, or an integer outside the supported domain.
 * - When the plan has a kind the codec cannot convert, or a reference of a
 *   form or to a resource it cannot convert, either function throws the same
 *   object with `unsupportedKind` set to that kind, whatever the value is.
 * - When `decode` addresses the object a reference names and the app has no
 *   such object, it throws the same object with `missingResource` set to the
 *   reference's resource.
 */
export interface NativeCodec {
  /** In-process JavaScript defining the decode and encode functions. */
  readonly prelude: string
}

/** Identity tag marking embedded automation-process JavaScript for tooling. */
const js = String.raw

/**
 * Builds a prelude around the source text of a self-contained factory that
 * returns `{ decode, encode }`. The factory runs inside a strict-mode function
 * scope, so its helpers stay local and only the two declared bindings become
 * globals.
 */
function buildPrelude(factorySource: string): string {
  return js`var ${NATIVE_DECODE_FUNCTION}, ${NATIVE_ENCODE_FUNCTION};
(function () {
  'use strict';
  var codec = (${factorySource})();
  ${NATIVE_DECODE_FUNCTION} = codec.decode;
  ${NATIVE_ENCODE_FUNCTION} = codec.encode;
})();
`
}

/**
 * The in-process value codec.
 *
 * @remarks
 * Its prelude embeds the codec functions' source text, so the conversions
 * that run inside the automation process are the same code that the
 * package's unit tests exercise in Node. It implements every value plan kind
 * except `file` and `file-source`, which fail with a codec error marked with
 * the unsupported kind. References convert in identity form only, one object
 * at a time, to a resource the app finds at the application by its
 * identifier; any other reference is marked unsupported as well.
 *
 * Conversions follow the value contracts: integers are canonical decimal
 * text within the safe-integer domain, numbers in dynamic content are always
 * doubles, special double states and `-0` are explicit, dates are UTC text
 * with millisecond precision, and RGB colors decode to the 16-bit channel
 * list `[r, g, b]`.
 */
export const NATIVE_CODEC: NativeCodec = Object.freeze({
  prelude: buildPrelude(createNativeCodecFunctions.toString()),
})

/**
 * How the app finds an object of one resource from its identifier, and where
 * the object holds that identifier: manifest knowledge the codec needs to turn
 * a reference into the app's object and back.
 *
 * @remarks
 * It follows the resource's identifier targeting (phases/13 D10), as a
 * generated get does: `byId` asks the collection for the item with that id,
 * and `byProperty` matches `property` against the identifier. Either way the
 * identifier a reference carries is the value of `property`, so reading it
 * back from an object gives the identifier that finds the object again.
 */
export interface NativeAddressing {
  /** The app's spelling of the resource's collection at the application. */
  readonly collection: string
  /** How the collection finds an item from its identifier. */
  readonly lookup: 'byId' | 'byProperty'
  /** The app's spelling of the property that holds the identifier. */
  readonly property: string
}

/**
 * Everything the codec knows about references to one resource: the
 * identifier plan from the app's contract, and the addressing from its
 * manifest.
 *
 * @remarks
 * `id` is absent for a resource with no identifier. `addressing` is absent
 * when the app cannot find an object of the resource at the application by its
 * identifier: it has no identifier, or it is found only within a container (its
 * get records a parent). A reference to such a resource does not convert.
 */
export interface NativeReferencePlans {
  /** The plan of the resource's identifier. */
  readonly id?: ValuePlan
  /** How the app finds an object of the resource, and reads its identifier. */
  readonly addressing?: NativeAddressing
}

/**
 * The resources whose references a native script may convert, keyed by
 * manifest resource key.
 */
export type NativeReferenceTable = Readonly<Record<string, NativeReferencePlans>>

/**
 * What the codec functions are given besides a value and its plan.
 *
 * @remarks
 * `app` is the target application object, which addressing a reference calls
 * into; the codec calls no other host object. `references` is the script's
 * {@link NativeScript.references}.
 */
export interface NativeCodecEnvironment {
  /** The target application. */
  readonly app: unknown
  /** The resources whose references convert. */
  readonly references: NativeReferenceTable
}

/**
 * One native invocation, expressed without interpolating any value into source
 * text.
 *
 * @remarks
 * `body` is a function body invoked as `(app, args)`, where `app` is the target
 * application and `args` is the decoded input record. The executor composes the
 * script as: codec prelude, then the application object, then decode of
 * `input` against `inputPlan`, then `body`, then encode of its result against
 * `outputPlan`, all inside one try/catch that yields a {@link NativeOutcome}.
 * Decoding and encoding receive `{ app, references }`, because converting a
 * reference addresses the app. Creating the application object sends the app
 * nothing, so a decode failure still means no command was sent.
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
  /**
   * The resources whose references convert: at least every resource a
   * reference in either plan names, each with its identifier plan and its
   * addressing. Empty when the plans hold no reference.
   */
  readonly references: NativeReferenceTable
}

/**
 * Why a native invocation did not produce a wire value.
 *
 * @remarks
 * - `app`: the application or the automation bridge raised an error.
 *   `errorNumber` is the bridge's numeric error code when one was provided; the
 *   executor maps it to a canonical structured error.
 * - `codec`: the codec could not convert a value. Without `unsupportedKind`,
 *   the value violated its plan: on `encode` the app returned something the
 *   contract does not allow, and on `decode` a bridge form could not be
 *   produced from already-validated input. With `unsupportedKind`, the plan
 *   has a kind (or a reference form, or a resource) the codec has no
 *   conversion for, so no value at that position could be converted. With
 *   `missingResource`, the input names an object of that resource that the
 *   app does not have.
 */
export type NativeFailure =
  | { readonly source: 'app'; readonly message: string; readonly errorNumber?: number }
  | {
      readonly source: 'codec'
      readonly direction: 'decode' | 'encode'
      readonly path: IssuePath
      readonly message: string
      /** The plan kind the codec cannot convert, when that is why it failed. */
      readonly unsupportedKind?: string
      /**
       * The resource of a referenced object the app does not have, when that
       * is why decoding failed.
       */
      readonly missingResource?: string
    }

/** What the automation process reports for one {@link NativeScript}. */
export type NativeOutcome =
  | { readonly ok: true; readonly value: WireValue }
  | { readonly ok: false; readonly failure: NativeFailure }
