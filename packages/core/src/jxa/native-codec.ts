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
import type { PageWindow } from '../execution/executor.js'
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
 *   reference position becomes an identity reference; one whose resource is
 *   found within a container must come with the record it was read through
 *   ({@link NATIVE_CONTAINED_REFERENCE_KEY}), which becomes its container.
 *   A record field's value a body hands over marked as one its property's
 *   evidence lets read as absent ({@link NATIVE_ABSENT_AS_NULL_KEY}) encodes
 *   as `null` at a nullable position when the app reports its object missing
 *   (-1728) as the codec reads the object's identity.
 * - Each marker is an object whose only own property is a registry symbol,
 *   and is honoured only at the position it is made for. A marker anywhere
 *   else is not a record, so it fails by its plan, under `unknown` too. A
 *   string key of the same name is ordinary data.
 * - `env` is `{ app, references }`. Without it, no reference converts.
 * - Under a `passthrough` plan, both functions return their argument
 *   unchanged, without inspecting it.
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
 * - When the app fails while `encode` reads a record field's value (a
 *   reference's identifier), the app's error is let through with
 *   {@link NATIVE_READING_KEY} naming that field and its position.
 */
export interface NativeCodec {
  /** In-process JavaScript defining the decode and encode functions. */
  readonly prelude: string
}

/**
 * Global symbol registry key (`Symbol.for`) of the marker a native body hands
 * the codec at a reference position whose target is got within the record
 * the field was read through (phases/13 D7, container scoping). The marker is
 * an object whose only own property is that symbol, holding
 * `{ value, container }` or `{ value, containerId }`:
 *
 * - `value` is what the app returned at the position: an object of the
 *   target, or a specifier the codec reads the target's id from (Chrome's
 *   `windows.byId(W).activeTab`).
 * - `container` is the record's item, whose id the codec reads by the
 *   parent's addressing; `containerId` is the record's identifier, already
 *   read (a list row's).
 *
 * The codec encodes the reference with the container in identity form, in the
 * same request. The marker is honoured only at a reference position whose
 * resource is found within a container; anywhere else it is not a record,
 * so it fails by its plan. It is a registry symbol, not a string, because no
 * app record and no JSON value can carry a symbol key, so no app data is
 * taken for the marker. A body hands values over this way only under a typed
 * output plan, and only at positions the output rule keeps with their
 * container (`containerReferences` in `NativeBodyOptions`).
 */
export const NATIVE_CONTAINED_REFERENCE_KEY = 'macts.containedReference'

/**
 * Global symbol registry key (`Symbol.for`) of the marker a native body hands
 * the codec for a field whose nullability evidence makes the app's "no such
 * object" failure (-1728) the field's empty value (`readsAbsentAsNull`,
 * phases/13 D10). The marker is an object whose only own property is that
 * symbol, holding what the body read for the field, in any form the codec
 * accepts there, including a {@link NATIVE_CONTAINED_REFERENCE_KEY} marker.
 *
 * The key is a registry symbol, not a string, because no app record and no
 * JSON value can carry a symbol key: the app bridge and JSON produce string
 * keys only. So an app record that happens to have a key of the same name is
 * never taken for the marker. Nothing may serialize the value between the
 * body and the codec, which run in one script: a serialized marker would lose
 * its symbol. A body marks values only for a result the codec encodes by a
 * typed plan; under a `passthrough` plan the codec returns its argument
 * unchanged, and a marker would reach the caller as it is.
 *
 * The marker is honoured only as a record field's value, where bodies put
 * it: the get record's fields and each list row's. Anywhere else it is not a
 * record, so it fails by its plan.
 *
 * An app can hand back an object it reports missing only when the object is
 * read, which for a reference is when the codec reads its identifier. At a
 * nullable position the codec encodes such a value as `null`, wherever the
 * body read it from: an item's property record, a column read across a
 * collection, or a read on its own. Only the read of the value's own object
 * counts, or of any one element's object when the value is a list, which
 * then makes the whole field `null`. The same failure reading a container's
 * identity still fails, as does any other failure, and at a position that
 * cannot be `null` the value encodes as if it were not marked.
 */
export const NATIVE_ABSENT_AS_NULL_KEY = 'macts.absentAsNull'

/**
 * Property a native body or the codec sets on an app's error, as it lets the
 * error through, to say what was being read when the app failed: `the items`,
 * or `the property "holder"`, with the result position for a value the
 * codec was encoding (`at [2]`). It holds only names from the manifest and
 * positions in the result, never a value the app returned. The innermost read
 * that lets the error through sets it; one already set is kept.
 *
 * The executor keeps it on the app failure (`reading` in {@link NativeFailure})
 * and puts it in the message of the error's cause, so a failure such as "no
 * such object" says which read it came from.
 */
export const NATIVE_READING_KEY = '__mactsReading'

/**
 * Marker `name` of the object a list body throws when its collection changed
 * while it was read, so no consistent result exists. The executor reports it
 * as a changed collection, distinct from both an app failure and a result
 * that breaks the contract.
 */
export const NATIVE_COLLECTION_CHANGED_ERROR_NAME = 'MactsCollectionChanged'

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
 * at a time, to a resource the app finds by its identifier, at the
 * application or within a container that is itself in identity form; any
 * other reference is marked unsupported as well.
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
 * generated get does. A resource found in a collection is addressed by
 * {@link NativeCollectionAddressing}; a singleton root, which the app holds
 * as its own properties, by {@link NativeRootAddressing}.
 */
export type NativeAddressing = NativeCollectionAddressing | NativeRootAddressing

/**
 * How a resource's collection finds an object from its identifier: `byId`
 * asks the collection for the item with that id, `byProperty` matches
 * `property` against the identifier, and `byKey` applies the collection's key
 * specifier to it. In each case the identifier a reference carries is the
 * value of `property`, so reading it back from an object gives the identifier
 * that finds the object again.
 *
 * When the resource's get records a parent, `within` names that parent: the
 * resource is identified only within its container (phases/13 D7, container
 * scoping), so `collection` is the container's, a reference to it carries the
 * container, and the container is found first by the parent's own addressing,
 * whatever its targeting.
 */
export interface NativeCollectionAddressing {
  /**
   * The app's spelling of the resource's collection: at the application, or
   * at the container when `within` is set.
   */
  readonly collection: string
  /** How the collection finds an item from its identifier. */
  readonly lookup: 'byId' | 'byProperty' | 'byKey'
  /** The app's spelling of the property that holds the identifier. */
  readonly property: string
  /**
   * The manifest key of the parent the resource is found within; absent for
   * a resource found at the application.
   */
  readonly within?: string
}

/**
 * How the app holds the objects of a singleton root: the identifier a
 * reference carries is a kind, and `roots` maps each kind to the app's
 * spelling of the application property that holds its object. A kind the map
 * does not hold names no object. The object holds nothing that says which
 * kind it is, so an object read from the app cannot be encoded as a reference
 * to a root.
 */
export interface NativeRootAddressing {
  /** The object is the application property its kind names. */
  readonly lookup: 'byRoot'
  /** Each kind, with the app's spelling of the application property holding it. */
  readonly roots: Readonly<Record<string, string>>
}

/**
 * Everything the codec knows about references to one resource: the
 * identifier plan from the app's contract, and the addressing from its
 * manifest.
 *
 * @remarks
 * `id` is absent for a resource with no identifier. `addressing` is absent
 * when the app cannot find an object of the resource by its identifier: it
 * has no identifier or no get, or it is found within a parent that has no
 * addressing. A reference to such a resource does not convert.
 */
export interface NativeReferencePlans {
  /** The plan of the resource's identifier. */
  readonly id?: ValuePlan
  /** How the app finds an object of the resource, and reads its identifier. */
  readonly addressing?: NativeAddressing
}

/**
 * The resources whose references a native script may convert, keyed by
 * manifest resource key. A resource found within a parent comes with the
 * parent's entry too.
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
 * `body` is a function body invoked as `(app, args, page)`, where `app` is the
 * target application, `args` is the decoded input record, and `page` is the
 * page window a paged list reads (`null` when there is none). The executor
 * composes the script as: codec prelude, then the application object, then
 * decode of `input` against `inputPlan`, then `body`, then encode of its
 * result against `outputPlan`, all inside one try/catch that yields a
 * {@link NativeOutcome}. Decoding and encoding receive `{ app, references }`,
 * because converting a reference addresses the app. No member of the app is
 * read or called until the whole input has converted, so an input value that
 * cannot convert fails before the app receives any event.
 */
export interface NativeScript {
  /** Bundle identifier of the target application. */
  readonly bundleId: string
  /** Function body run as `(app, args, page)`. */
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
  /**
   * The window a paged list body reads, passed to the body as its `page`
   * argument as plain data. Absent for every other body.
   */
  readonly page?: PageWindow | undefined
}

/**
 * Why a native invocation did not produce a wire value.
 *
 * @remarks
 * - `app`: the application or the automation bridge raised an error.
 *   `errorNumber` is the bridge's numeric error code when one was provided; the
 *   executor maps it to a canonical structured error. `missingResource` is set
 *   when a body found the parent of a scoped operation missing: the failure
 *   names that resource rather than the operation's own.
 * - `codec`: the codec could not convert a value. Without `unsupportedKind`,
 *   the value violated its plan: on `encode` the app returned something the
 *   contract does not allow, and on `decode` a bridge form could not be
 *   produced from already-validated input. With `unsupportedKind`, the plan
 *   has a kind (or a reference form, or a resource) the codec has no
 *   conversion for, so no value at that position could be converted. With
 *   `missingResource`, the input names an object of that resource that the
 *   app does not have.
 * - `collection`: the collection a list read changed while it was read, so no
 *   consistent result exists (raised by list bodies with
 *   {@link NATIVE_COLLECTION_CHANGED_ERROR_NAME}).
 */
export type NativeFailure =
  | {
      readonly source: 'app'
      readonly message: string
      readonly errorNumber?: number
      /**
       * The resource of the object the body found missing, when it is not the
       * operation's own: the parent of a scoped operation.
       */
      readonly missingResource?: string
      /**
       * What was being read when the app failed, from
       * {@link NATIVE_READING_KEY}: names and result positions, never a value.
       */
      readonly reading?: string
    }
  | { readonly source: 'collection'; readonly message: string }
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
