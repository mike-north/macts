/**
 * The in-process value codec: conversion between wire values and native
 * automation values, as one self-contained function.
 *
 * {@link createNativeCodecFunctions} is embedded into the automation process
 * through `Function.prototype.toString()` (see `NATIVE_CODEC` in
 * `native-codec.ts`) and is also called directly by Node unit tests. That dual
 * use imposes the invariants every edit to it must keep:
 *
 * - **Self-contained.** It references no identifier from module scope or from
 *   imports at runtime. Every helper is nested inside it, and every constant it
 *   needs is written literally inside it. Type annotations and type-only
 *   imports are fine because they are erased. The literals are exposed through
 *   {@link NativeCodecFunctions.literals} so tests can hold them equal to the
 *   exported contract constants.
 * - **Host-neutral.** It uses only language built-ins: no `globalThis`,
 *   `console`, `ObjC`, `$`, `require`, or other host objects. The only host
 *   objects it touches are the ones it is given: the application in its
 *   environment, and app objects at reference positions, whose members it
 *   calls to address an object and to read its identifier.
 * - **Nothing reaches the app before the input converted.** Decoding runs in
 *   two phases. The first converts the whole input without reading or calling
 *   any member of the application: every validation failure and every
 *   unsupported-kind failure happens there, and a reference it can convert
 *   becomes a pending address. Only the second phase uses the application, to
 *   find each pending address's object and check that it exists. So a value
 *   that cannot convert fails before the app receives anything, wherever it
 *   sits in the input.
 * - **Transpile-stable.** It avoids syntax that a build step could lower into
 *   calls to injected helpers (object spread, class fields, `async`,
 *   generators, decorators). The built-module test guards this.
 *
 * Plans and semantics follow `phases/13-sdk-value-and-execution-contracts.md`
 * (A2–A4, D3, D4, D9, D10).
 *
 * @packageDocumentation
 */

import type { FieldPlan, IssuePath, ValuePlan } from '@macts/contracts'
import type {
  NativeAddressing,
  NativeCodecEnvironment,
  NativePositionalAddressing,
  NativeRootAddressing,
} from './native-codec.js'

/** Which conversion a codec failure happened in. */
export type NativeCodecDirection = 'decode' | 'encode'

/**
 * The object the codec throws when it cannot convert a value.
 *
 * @remarks
 * It is a plain object rather than an `Error`, so it crosses the automation
 * process's serialization unchanged. `name` is always `'MactsCodecError'`.
 * `path` locates the offending value, outermost first: record keys as strings
 * and list positions as numbers, `[]` for the value itself. Inside dynamic
 * content, a record's path steps are the user's keys; the envelope is not a
 * step. `message` is user-facing.
 *
 * There are four causes, told apart by `unsupportedKind`, `missingResource`
 * and `outOfRangeResource`:
 *
 * - The value violates its plan (a fractional value at an integer position).
 *   Neither is present: the fault is the value's.
 * - The plan has a kind the codec has no conversion for (`file`,
 *   `file-source`, or a kind it does not recognize), or a reference the codec
 *   cannot convert: a selector other than an index selector to a positional
 *   resource, a collection, one located through a container its resource is
 *   not found within, one to a resource the app does not find by its
 *   identifier or its position, or, on encode, an object of a resource found
 *   within a container that came without the record it was read through, or
 *   an object of a positional resource whose specifier gives no position.
 *   `unsupportedKind` holds the kind: the fault is the codec's, whatever the
 *   value is.
 * - A reference being decoded names an object the app does not have.
 *   `missingResource` holds the reference's resource: the target is missing.
 * - An index selector being decoded names a position its container's
 *   collection does not reach. `outOfRangeResource` holds the reference's
 *   resource: the selection is invalid.
 */
export interface NativeCodecError {
  readonly name: string
  readonly direction: NativeCodecDirection
  readonly path: IssuePath
  readonly message: string
  /** The plan kind the codec cannot convert, when that is why it failed. */
  readonly unsupportedKind?: string
  /** The resource of a referenced object the app does not have, when that is why it failed. */
  readonly missingResource?: string
  /** The resource of a referenced position its collection does not reach, when that is why it failed. */
  readonly outOfRangeResource?: string
}

/**
 * The constants the codec spells literally because it cannot import them.
 * Each one mirrors an exported contract constant.
 */
export interface NativeCodecLiterals {
  /** Mirrors `NATIVE_CODEC_ERROR_NAME`. */
  readonly errorName: string
  /** Mirrors `INTEGER_LIMITS`. */
  readonly integerLimits: { readonly min: number; readonly max: number }
  /** Mirrors `RGB_CHANNEL_MAX`. */
  readonly rgbChannelMax: number
  /** Mirrors the `WIRE_KEYS` entries the codec reads and writes. */
  readonly wireKeys: {
    readonly integer: string
    readonly double: string
    readonly date: string
    readonly record: string
    readonly reference: string
  }
  /** Mirrors `NATIVE_CONTAINED_REFERENCE_KEY`. */
  readonly containedReference: string
  /** Mirrors `SPECIAL_DOUBLE_STATES`, in the same order. */
  readonly specialDoubleStates: readonly string[]
}

/** The functions {@link createNativeCodecFunctions} returns. */
export interface NativeCodecFunctions {
  /**
   * Converts a wire value into the native value its plan describes. Throws a
   * {@link NativeCodecError} with `direction: 'decode'` on a violation. A
   * reference becomes the app's object, addressed through `env`; without
   * `env`, no reference converts.
   */
  readonly decode: (wire: unknown, plan: ValuePlan, env?: NativeCodecEnvironment) => unknown
  /**
   * Converts a native value into its JSON-safe wire form. Throws a
   * {@link NativeCodecError} with `direction: 'encode'` on a violation. Under a
   * passthrough plan the argument is returned unchanged, so the result is
   * typed `unknown` rather than as a wire value. An app object at a reference
   * position becomes an identity reference, its identifier read as `env`
   * describes, or, where the plan records the index form, an index selector
   * within its container, its position read by `env.positionOf`; without
   * `env`, no reference converts.
   */
  readonly encode: (native: unknown, plan: ValuePlan, env?: NativeCodecEnvironment) => unknown
  /** The literal constants the functions use. */
  readonly literals: NativeCodecLiterals
}

/**
 * Creates the codec's `decode` and `encode` functions.
 *
 * @remarks
 * This function's source text is the codec that runs inside the automation
 * process. See the module comment for the constraints its body must keep.
 */
export function createNativeCodecFunctions(): NativeCodecFunctions {
  type Path = readonly (string | number)[]
  type Direction = 'decode' | 'encode'
  type Fields = Readonly<Record<string, FieldPlan>>
  type Env = NativeCodecEnvironment | undefined
  type ReferencePlan = Extract<ValuePlan, { readonly kind: 'reference' }>
  /**
   * A reference that converted in decoding's first phase and is yet to be
   * found in the app: the addressing and decoded identifier of its object,
   * and the pending address of the container it is found within, when its
   * resource is found within one. It stands at the reference's position until
   * the second phase replaces it with the object.
   */
  interface PendingAddress {
    readonly pendingAddress: true
    readonly resource: string
    readonly addressing: NativeAddressing
    readonly id: unknown
    readonly container?: PendingAddress
  }
  /** An object of the automation bridge: the application, or one of its objects. */
  type HostObject = Readonly<Record<string, unknown>>

  /** Marker `name` of thrown codec failures. */
  const ERROR_NAME = 'MactsCodecError'
  /** Largest magnitude of the integer domain: `2^53 - 1`. */
  const INTEGER_MAX = 9007199254740991
  /** Largest value of a 16-bit color channel. */
  const CHANNEL_MAX = 65535

  const KEY_INTEGER = 'integer'
  const KEY_DOUBLE = 'double'
  const KEY_DATE = 'date'
  const KEY_RECORD = 'record'
  const KEY_REFERENCE = 'reference'
  /** Sole key of a value a body hands over with the record it was read through. */
  const KEY_CONTAINED = '__mactsContainedReference'

  const STATE_NAN = 'NaN'
  const STATE_INFINITY = 'Infinity'
  const STATE_NEGATIVE_INFINITY = '-Infinity'
  const STATE_NEGATIVE_ZERO = '-0'

  /** Canonical integer text: no sign on zero, no leading zeros, no `+`. */
  const INTEGER_TEXT = /^(0|-?[1-9][0-9]*)$/
  /**
   * Wire date-time text: four-digit year, exactly three fractional digits,
   * and `Z`, `+HH:MM`, or `-HH:MM`. Groups: year, month, day, hour, minute, second,
   * millisecond, `Z`, offset sign, offset hours, offset minutes.
   */
  const DATE_TEXT =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})(?:(Z)|([+-])(\d{2}):(\d{2}))$/

  // -------------------------------------------------------------------------
  // Value inspection
  // -------------------------------------------------------------------------

  /** Whether `key` is an own property of `object`; inherited keys never count. */
  function hasOwn(object: object, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(object, key)
  }

  /**
   * Whether a value is a `Date`, judged by its built-in tag so that dates
   * from another realm (as the automation bridge may produce) qualify.
   */
  function isDate(value: unknown): value is Date {
    return Object.prototype.toString.call(value) === '[object Date]'
  }

  /** Whether a value is a list. */
  function isList(value: unknown): value is readonly unknown[] {
    return Array.isArray(value)
  }

  /** Whether a value is a keyed object: not null, not a list, not a date. */
  function isKeyed(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !isList(value) && !isDate(value)
  }

  /**
   * Whether a value is an ordinary record: keyed, tagged `Object`, and either
   * prototype-less or directly inheriting from a root prototype (one whose own
   * prototype is `null`).
   *
   * The tag alone is not enough. Host objects of the automation bridge, such
   * as path objects, are tagged `Object` but inherit from their own
   * prototypes; accepting them would encode them silently as empty records.
   * Records that apps return and object literals that script bodies build do
   * inherit directly from `Object.prototype`. The prototype test is written
   * without naming `Object.prototype` so that records from another realm
   * qualify too. Maps, sets, regular expressions, and class instances are
   * excluded as well.
   */
  function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
    if (!isKeyed(value) || Object.prototype.toString.call(value) !== '[object Object]') {
      return false
    }
    const proto: unknown = Object.getPrototypeOf(value)
    return proto === null || Object.getPrototypeOf(proto) === null
  }

  /** The own value of `key`, or `undefined` when it is absent or inherited. */
  function ownValue(object: Readonly<Record<string, unknown>>, key: string): unknown {
    return hasOwn(object, key) ? object[key] : undefined
  }

  /**
   * Defines `key` as an own enumerable data property. Plain assignment is not
   * used because assigning a key named `__proto__` would replace the
   * object's prototype instead of creating a field.
   */
  function setOwn(object: object, key: string, value: unknown): void {
    Object.defineProperty(object, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }

  /** The key of a single-key keyed object, or `undefined` for anything else. */
  function soleKey(value: unknown): string | undefined {
    if (!isKeyed(value)) return undefined
    const keys = Object.keys(value)
    return keys.length === 1 ? keys[0] : undefined
  }

  // -------------------------------------------------------------------------
  // Messages and failures
  // -------------------------------------------------------------------------

  /** A string quoted for a message, shortened when long. */
  function quote(text: string): string {
    const shown = text.length > 60 ? text.slice(0, 57) + '...' : text
    return JSON.stringify(shown)
  }

  /** Number text that keeps negative zero visible. */
  function numberText(value: number): string {
    return Object.is(value, -0) ? '-0' : String(value)
  }

  /** A short user-facing description of a received value. */
  function describeValue(value: unknown): string {
    if (value === undefined) return 'no value'
    if (value === null) return 'null'
    if (typeof value === 'string') return quote(value)
    if (typeof value === 'number') return numberText(value)
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (isList(value)) {
      return 'a list of ' + String(value.length) + (value.length === 1 ? ' item' : ' items')
    }
    if (isDate(value)) return 'a date'
    if (isKeyed(value)) {
      const keys = Object.keys(value)
      if (keys.length === 0) return 'an empty object'
      const shown = keys.slice(0, 5).map(quote).join(', ')
      return 'an object with keys ' + shown + (keys.length > 5 ? ', ...' : '')
    }
    return 'a value of an unsupported type'
  }

  /** A list of strings quoted for a message. */
  function quoteAll(values: readonly string[]): string {
    return values.length === 0 ? '(none)' : values.map(quote).join(', ')
  }

  /** Throws a codec failure. `path` is copied so later steps cannot alter it. */
  function fail(direction: Direction, path: Path, message: string): never {
    const error: NativeCodecError = { name: ERROR_NAME, direction, path: path.slice(), message }
    // The contract (phases/13 D4) requires a plain object marked by `name`,
    // not an Error instance, so it crosses process serialization intact.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw error
  }

  /**
   * Throws the codec failure for a plan kind the codec has no conversion for,
   * marked with that kind so it is never mistaken for a value that violates
   * its plan.
   */
  function failUnsupported(direction: Direction, path: Path, kind: string, message: string): never {
    const error: NativeCodecError = {
      name: ERROR_NAME,
      direction,
      path: path.slice(),
      message,
      unsupportedKind: kind,
    }
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw error
  }

  /**
   * Throws the decode failure for a referenced object the app does not have,
   * marked with the reference's resource so it is reported as a missing
   * target rather than as invalid input.
   */
  function failMissing(path: Path, resource: string): never {
    const error: NativeCodecError = {
      name: ERROR_NAME,
      direction: 'decode',
      path: path.slice(),
      message: 'The app has no ' + quote(resource) + ' with this identifier',
      missingResource: resource,
    }
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw error
  }

  /**
   * Throws the decode failure for a referenced position its container's
   * collection does not reach, marked with the reference's resource so it is
   * reported as an invalid selection rather than as invalid input.
   */
  function failOutOfRange(path: Path, resource: string): never {
    const error: NativeCodecError = {
      name: ERROR_NAME,
      direction: 'decode',
      path: path.slice(),
      message: 'The container holds no ' + quote(resource) + ' at this position',
      outOfRangeResource: resource,
    }
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw error
  }

  /** Whether a number lies within an inclusive range; `NaN` never does. */
  function inRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max
  }

  // -------------------------------------------------------------------------
  // Leaf encoders: native to wire
  // -------------------------------------------------------------------------

  /**
   * Encodes a safe integer as canonical decimal text. `-0` becomes `"0"`
   * because integers have no signed zero. Values outside the domain fail
   * rather than becoming doubles: the bridge has already rounded them.
   */
  function encodeInteger(native: unknown, path: Path): Record<string, string> {
    if (typeof native !== 'number' || !Number.isInteger(native)) {
      fail('encode', path, 'Expected an integer, received ' + describeValue(native))
    }
    if (Math.abs(native) > INTEGER_MAX) {
      fail(
        'encode',
        path,
        'Integer ' +
          numberText(native) +
          ' is outside the supported range -9007199254740991 to 9007199254740991'
      )
    }
    return { [KEY_INTEGER]: native === 0 ? '0' : String(native) }
  }

  /**
   * Encodes any number as a double. Finite values other than `-0` stay JSON
   * numbers; `NaN`, the infinities, and `-0` become explicit states.
   */
  function encodeDouble(native: unknown, path: Path): Record<string, number | string> {
    if (typeof native !== 'number') {
      fail('encode', path, 'Expected a number, received ' + describeValue(native))
    }
    let payload: number | string = native
    if (Number.isNaN(native)) payload = STATE_NAN
    else if (native === Infinity) payload = STATE_INFINITY
    else if (native === -Infinity) payload = STATE_NEGATIVE_INFINITY
    else if (Object.is(native, -0)) payload = STATE_NEGATIVE_ZERO
    return { [KEY_DOUBLE]: payload }
  }

  /**
   * Encodes a valid date as UTC text with millisecond precision. Years outside
   * 0000 through 9999 would need the six-digit extended form, which the wire format
   * does not admit, so they fail.
   */
  function encodeDate(native: unknown, path: Path): Record<string, string> {
    if (!isDate(native)) {
      fail('encode', path, 'Expected a date, received ' + describeValue(native))
    }
    if (Number.isNaN(native.getTime())) {
      fail('encode', path, 'Expected a valid date, received an invalid date')
    }
    const text = native.toISOString()
    if (!DATE_TEXT.test(text)) {
      fail('encode', path, 'Date ' + text + ' is outside the supported years 0000 through 9999')
    }
    return { [KEY_DATE]: text }
  }

  /** Encodes one geometry member, which must be a number, as a double. */
  function encodeMember(native: unknown, path: Path): Record<string, number | string> {
    if (typeof native !== 'number') {
      fail('encode', path, 'Expected a number, received ' + describeValue(native))
    }
    return encodeDouble(native, path)
  }

  /** Encodes a point given as `{x, y}` or as a two-element list `[x, y]`. */
  function encodePoint(native: unknown, path: Path): Record<string, unknown> {
    if (isList(native)) {
      if (native.length !== 2) {
        fail('encode', path, 'Expected a point as x and y, received ' + describeValue(native))
      }
      return {
        x: encodeMember(native[0], path.concat([0])),
        y: encodeMember(native[1], path.concat([1])),
      }
    }
    if (!isKeyed(native)) {
      fail('encode', path, 'Expected a point with x and y, received ' + describeValue(native))
    }
    return {
      x: encodeMember(ownValue(native, 'x'), path.concat(['x'])),
      y: encodeMember(ownValue(native, 'y'), path.concat(['y'])),
    }
  }

  /**
   * Encodes a rectangle given as `{x, y, width, height}`. A four-element list
   * is rejected: it could mean corner bounds or origin and size, and guessing
   * would silently produce the wrong rectangle.
   */
  function encodeRectangle(native: unknown, path: Path): Record<string, unknown> {
    if (isList(native)) {
      fail(
        'encode',
        path,
        'Expected a rectangle with x, y, width, and height; received ' +
          describeValue(native) +
          ', which is ambiguous between corner bounds and origin and size'
      )
    }
    if (!isKeyed(native)) {
      fail(
        'encode',
        path,
        'Expected a rectangle with x, y, width, and height; received ' + describeValue(native)
      )
    }
    return {
      x: encodeMember(ownValue(native, 'x'), path.concat(['x'])),
      y: encodeMember(ownValue(native, 'y'), path.concat(['y'])),
      width: encodeMember(ownValue(native, 'width'), path.concat(['width'])),
      height: encodeMember(ownValue(native, 'height'), path.concat(['height'])),
    }
  }

  /** Validates a 16-bit color channel: an integer from 0 to 65535. */
  function checkChannel(direction: Direction, value: unknown, path: Path): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || !inRange(value, 0, CHANNEL_MAX)) {
      fail(
        direction,
        path,
        'Expected a color channel integer from 0 to 65535, received ' + describeValue(value)
      )
    }
    return value
  }

  /** Encodes one validated 16-bit color channel as an integer. */
  function encodeChannel(native: unknown, path: Path): Record<string, string> {
    return encodeInteger(checkChannel('encode', native, path), path)
  }

  /**
   * Encodes a 16-bit RGB color given as a three-channel list, as `{r, g, b}`,
   * or as `{red, green, blue}`.
   */
  function encodeRgb(native: unknown, path: Path): Record<string, unknown> {
    if (isList(native)) {
      if (native.length !== 3) {
        fail(
          'encode',
          path,
          'Expected a color as a list of 3 channels, received ' + describeValue(native)
        )
      }
      return {
        r: encodeChannel(native[0], path.concat([0])),
        g: encodeChannel(native[1], path.concat([1])),
        b: encodeChannel(native[2], path.concat([2])),
      }
    }
    if (!isKeyed(native)) {
      fail('encode', path, 'Expected a color, received ' + describeValue(native))
    }
    const short = hasOwn(native, 'r') || hasOwn(native, 'g') || hasOwn(native, 'b')
    const names: readonly [string, string, string] = short
      ? ['r', 'g', 'b']
      : ['red', 'green', 'blue']
    return {
      r: encodeChannel(ownValue(native, names[0]), path.concat([names[0]])),
      g: encodeChannel(ownValue(native, names[1]), path.concat([names[1]])),
      b: encodeChannel(ownValue(native, names[2]), path.concat([names[2]])),
    }
  }

  /**
   * Checks that a value is one of an enum's members. A non-member received
   * from the app most likely comes from a newer app version than the one the
   * contract describes, so the encode message says how to resolve it.
   */
  function checkMember(
    direction: Direction,
    value: unknown,
    members: readonly string[],
    path: Path
  ): string {
    if (typeof value !== 'string') {
      fail(
        direction,
        path,
        'Expected one of ' + quoteAll(members) + ', received ' + describeValue(value)
      )
    }
    if (!members.includes(value)) {
      if (direction === 'encode') {
        fail(
          direction,
          path,
          'Received ' +
            quote(value) +
            ', which is not one of the known values ' +
            quoteAll(members) +
            '. A newer version of the app may have added it; upgrading the app package may add support for it.'
        )
      }
      fail(direction, path, 'Expected one of ' + quoteAll(members) + ', received ' + quote(value))
    }
    return value
  }

  // -------------------------------------------------------------------------
  // Structural encoders
  // -------------------------------------------------------------------------

  /**
   * Encodes a record's planned fields; native keys outside the plan are
   * dropped. Only ordinary records qualify (see `isPlainObject`), so a host
   * object cannot pass as a record whose fields are all absent.
   *
   * Native "missing value" arrives as `null` and follows the presence rules:
   * a nullable field keeps `null`, an optional non-nullable field is omitted,
   * and a required non-nullable field fails. `undefined` (or a missing key) is
   * absence, which only an optional field can express: it is omitted there and
   * fails anywhere else, because absence is never materialized as `null`.
   *
   * No own property ever holds `undefined`.
   */
  function encodeRecord(
    native: unknown,
    fields: Fields,
    path: Path,
    env: Env
  ): Record<string, unknown> {
    if (!isPlainObject(native)) {
      fail('encode', path, 'Expected an object, received ' + describeValue(native))
    }
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(fields)) {
      const field = fields[key]
      if (field === undefined) continue
      const fieldPath = path.concat([key])
      const value = ownValue(native, key)
      const isNullable = field.value.kind === 'nullable'
      if (value === undefined) {
        if (field.presence !== 'optional') {
          fail('encode', fieldPath, 'Missing required field ' + quote(key))
        }
        // Omitted: an absent optional field has no key.
        continue
      }
      if (value === null) {
        if (isNullable) {
          setOwn(out, key, null)
        } else if (field.presence !== 'optional') {
          fail(
            'encode',
            fieldPath,
            'Expected a value for required field ' + quote(key) + ', received null'
          )
        }
        // Otherwise omitted: missing value at an optional non-nullable field.
        continue
      }
      setOwn(out, key, encodeValue(value, field.value, fieldPath, env))
    }
    return out
  }

  /**
   * Encodes dynamic content self-descriptively. Numbers are always doubles,
   * because integrality is not evidence of integer provenance. User objects
   * travel inside a record envelope with `undefined` values omitted, because
   * an absent record field simply has no key. Outside a record field there is
   * no way to express absence, and it is never materialized as `null`, so a
   * root or list-element `undefined` (including a hole in a sparse list)
   * fails.
   */
  function encodeDynamic(native: unknown, path: Path): unknown {
    if (native === undefined) {
      return fail('encode', path, 'Absent values cannot be represented outside a record field')
    }
    if (native === null) return null
    if (typeof native === 'string' || typeof native === 'boolean') return native
    if (typeof native === 'number') return encodeDouble(native, path)
    if (isDate(native)) return encodeDate(native, path)
    if (isList(native)) {
      const items: unknown[] = []
      for (let i = 0; i < native.length; i++) {
        items.push(encodeDynamic(native[i], path.concat([i])))
      }
      return items
    }
    if (isPlainObject(native)) {
      const payload: Record<string, unknown> = {}
      for (const key of Object.keys(native)) {
        const value = native[key]
        if (value === undefined) continue
        setOwn(payload, key, encodeDynamic(value, path.concat([key])))
      }
      return { [KEY_RECORD]: payload }
    }
    return fail(
      'encode',
      path,
      'Unsupported value in dynamic content: received ' + describeValue(native)
    )
  }

  /** User-facing name of a kind that has no conversion in this codec. */
  function unconvertedKindName(kind: string): string {
    if (kind === 'file') return 'File'
    return 'File source'
  }

  // -------------------------------------------------------------------------
  // References: app objects and identity references
  // -------------------------------------------------------------------------

  /**
   * Whether a value is an object of the automation bridge, whose members can
   * be read and called. The bridge's objects are functions as often as plain
   * objects.
   */
  function isHostObject(value: unknown): value is HostObject {
    return (typeof value === 'object' || typeof value === 'function') && value !== null
  }

  /**
   * Calls the member `name` of a bridge object with `object` as its receiver,
   * as `object[name](...args)` does. A member that is not a function fails as
   * `expected` at `path`.
   */
  function callMember(
    direction: Direction,
    object: HostObject,
    name: string,
    args: readonly unknown[],
    path: Path,
    expected: string
  ): unknown {
    const member = object[name]
    if (typeof member !== 'function') {
      fail(direction, path, 'Expected ' + expected + ', received ' + describeValue(object))
    }
    const result: unknown = Reflect.apply(member, object, args)
    return result
  }

  /**
   * What converting references to `resource` needs: its identifier plan and
   * its addressing. A resource the environment has neither for (it has no
   * identifier, the app has no addressing for it, or the script was given no
   * environment) fails as unsupported at the reference's position.
   */
  function referencePlansOf(
    direction: Direction,
    env: Env,
    resource: string,
    path: Path
  ): { readonly id: ValuePlan; readonly addressing: NativeAddressing } {
    if (env === undefined) {
      return failUnsupported(
        direction,
        path,
        'reference',
        'References have no conversion without the resources they name'
      )
    }
    const references = env.references
    const entry = hasOwn(references, resource) ? references[resource] : undefined
    const id = entry === undefined ? undefined : entry.id
    const addressing = entry === undefined ? undefined : entry.addressing
    if (id === undefined || addressing === undefined) {
      return failUnsupported(
        direction,
        path,
        'reference',
        'References to ' +
          quote(resource) +
          ' have no conversion in this codec: the app does not find its objects by their identifier'
      )
    }
    return { id, addressing }
  }

  /**
   * The manifest key of the parent `addressing`'s resource is found within,
   * or `undefined` for one found at the application. A singleton root is
   * always held by the application itself.
   */
  function containerOf(addressing: NativeAddressing): string | undefined {
    return addressing.lookup === 'byRoot' ? undefined : addressing.within
  }

  /**
   * The app's object of `addressing`'s resource whose identifier is `id`,
   * found as a generated get finds it, in `owner`'s collection: the
   * application's, or a container's. The object must exist: a miss fails as a
   * missing target, before any command uses it.
   */
  function addressObject(
    owner: HostObject,
    addressing: NativeAddressing,
    id: unknown,
    resource: string,
    path: Path
  ): HostObject {
    // A root has no container (`containerOf`), so its owner is the application.
    if (addressing.lookup === 'byRoot') return addressRoot(owner, addressing, id, resource, path)
    const expected =
      (addressing.within === undefined ? 'the application' : 'the container') +
      ' to have a collection ' +
      quote(addressing.collection)
    const collection = owner[addressing.collection]
    if (!isHostObject(collection)) {
      return fail(
        'decode',
        path,
        'Expected ' + expected + ', received ' + describeValue(collection)
      )
    }
    let object: unknown
    if (addressing.lookup === 'byIndex') {
      // The app's element addressing by zero-based position; a position the
      // collection does not reach is an invalid selection, never a guess.
      const length = collection['length']
      if (typeof length !== 'number') {
        return fail(
          'decode',
          path,
          'Expected the length of ' +
            quote(addressing.collection) +
            ', received ' +
            describeValue(length)
        )
      }
      if (typeof id !== 'number' || !(id >= 0 && id < length)) return failOutOfRange(path, resource)
      object = callMember('decode', collection, 'at', [id], path, expected)
    } else if (addressing.lookup === 'byProperty') {
      const match: Record<string, unknown> = {}
      setOwn(match, addressing.property, id)
      const matches = callMember('decode', collection, 'whose', [match], path, expected)
      object = isHostObject(matches) ? matches[0] : undefined
    } else if (addressing.lookup === 'byKey') {
      // The bridge's key specifier: the identifier is the key the app interprets.
      object = callMember('decode', collection, 'byName', [id], path, expected)
    } else {
      object = callMember('decode', collection, 'byId', [id], path, expected)
    }
    if (!isHostObject(object)) {
      return fail('decode', path, 'Expected ' + expected + ', received ' + describeValue(object))
    }
    if (callMember('decode', object, 'exists', [], path, 'an object') !== true) {
      return failMissing(path, resource)
    }
    return object
  }

  /**
   * The app's object of a singleton root whose kind is `id`: the application
   * property `addressing` maps the kind to. A kind the map does not hold, and
   * an object the app does not have at that property on this Mac, both fail
   * as a missing target.
   */
  function addressRoot(
    app: HostObject,
    addressing: NativeRootAddressing,
    id: unknown,
    resource: string,
    path: Path
  ): HostObject {
    const roots = addressing.roots
    const property = typeof id === 'string' && hasOwn(roots, id) ? roots[id] : undefined
    if (property === undefined) return failMissing(path, resource)
    const object = app[property]
    if (!isHostObject(object)) {
      return fail(
        'decode',
        path,
        'Expected the application to have a property ' +
          quote(property) +
          ', received ' +
          describeValue(object)
      )
    }
    if (callMember('decode', object, 'exists', [], path, 'an object') !== true) {
      return failMissing(path, resource)
    }
    return object
  }

  /**
   * Decodes a reference, in decoding's first phase, to the pending address of
   * the app's object it names. Converted: a single identity reference to a
   * resource the app finds by its identifier, with no container when it is
   * found at the application, and with its container, itself converted the
   * same way, when it is found within its parent (`addressing.within`). Its
   * `id` is decoded by the resource's identifier plan. Every other reference,
   * including selectors, collections and a container on a resource found at
   * the application, fails as unsupported; a malformed one fails as invalid,
   * as does a missing container or one of another resource. The application
   * is not used: only whether there is one to address is checked.
   */
  function decodeReference(
    wire: unknown,
    plan: ReferencePlan,
    env: Env,
    path: Path
  ): PendingAddress {
    return decodeReferencePayload(
      controlPayload(wire, KEY_REFERENCE, 'a reference', path),
      plan,
      env,
      path
    )
  }

  /**
   * {@link decodeReference} of a reference's payload: what a `reference`
   * control record holds, and what a reference's `container` holds directly.
   * A container (`asContainer`) converts in identity form only, at every
   * level of the chain: a selector never appears inside a container (D7), and
   * resolution refuses one there too.
   */
  function decodeReferencePayload(
    payload: unknown,
    plan: ReferencePlan,
    env: Env,
    path: Path,
    asContainer = false
  ): PendingAddress {
    if (!isKeyed(payload)) {
      return fail('decode', path, 'Expected a reference, received ' + describeValue(payload))
    }
    if (ownValue(payload, 'resource') !== plan.resource) {
      fail('decode', path.concat(['resource']), 'Expected a reference to ' + quote(plan.resource))
    }
    if (ownValue(payload, 'cardinality') !== plan.cardinality) {
      fail(
        'decode',
        path.concat(['cardinality']),
        'Expected cardinality ' + quote(plan.cardinality)
      )
    }
    const form = ownValue(payload, 'form')
    if (form !== 'identity' && form !== 'selector') {
      fail('decode', path.concat(['form']), 'Expected form "identity" or "selector"')
    }
    if (plan.cardinality !== 'one') {
      return failUnsupported(
        'decode',
        path,
        'reference',
        'Collection references have no conversion in this codec'
      )
    }
    if (form === 'selector') {
      if (asContainer) {
        return failUnsupported(
          'decode',
          path,
          'reference',
          'A container converts only as an identity reference, never as a selector'
        )
      }
      return decodeIndexSelector(payload, plan, env, path)
    }
    for (const key of Object.keys(payload)) {
      if (
        key !== 'resource' &&
        key !== 'form' &&
        key !== 'cardinality' &&
        key !== 'id' &&
        key !== 'container'
      ) {
        fail('decode', path.concat([key]), 'Unexpected field ' + quote(key))
      }
    }
    if (!hasOwn(payload, 'id')) fail('decode', path, 'Missing required field "id"')
    const plans = referencePlansOf('decode', env, plan.resource, path)
    const within = containerOf(plans.addressing)
    const hasContainer = hasOwn(payload, 'container')
    if (within === undefined && hasContainer) {
      return failUnsupported(
        'decode',
        path,
        'reference',
        'References to ' +
          quote(plan.resource) +
          ' located through a container have no conversion in this codec: the app finds them at the application'
      )
    }
    if (within !== undefined && !hasContainer) {
      fail('decode', path, 'Missing required field "container": a ' + quote(within))
    }
    const id = decodeValue(payload['id'], plans.id, path.concat(['id']), env)
    const container =
      within === undefined
        ? undefined
        : decodeReferencePayload(
            payload['container'],
            { kind: 'reference', resource: within, cardinality: 'one' },
            env,
            path.concat(['container']),
            true
          )
    if (env === undefined || !isHostObject(env.app)) {
      return failUnsupported(
        'decode',
        path,
        'reference',
        'References have no conversion without an application to address'
      )
    }
    const pending: PendingAddress = {
      pendingAddress: true,
      resource: plan.resource,
      addressing: plans.addressing,
      id,
    }
    if (container !== undefined) setOwn(pending, 'container', container)
    return pending
  }

  /**
   * {@link decodeReferencePayload} of a single selector reference. Only an
   * index selector to a positional resource converts (`addressing.lookup` is
   * `byIndex`), with its required identity container of the parent it is
   * found within: its position is its pending address's identifier. Every
   * other selector fails as unsupported.
   */
  function decodeIndexSelector(
    payload: Readonly<Record<string, unknown>>,
    plan: ReferencePlan,
    env: Env,
    path: Path
  ): PendingAddress {
    const addressing = positionalAddressingOf(env, plan.resource)
    if (addressing === undefined) {
      return failUnsupported(
        'decode',
        path,
        'reference',
        'Selector references have no conversion in this codec'
      )
    }
    for (const key of Object.keys(payload)) {
      if (
        key !== 'resource' &&
        key !== 'form' &&
        key !== 'cardinality' &&
        key !== 'selector' &&
        key !== 'container'
      ) {
        fail('decode', path.concat([key]), 'Unexpected field ' + quote(key))
      }
    }
    const selector = ownValue(payload, 'selector')
    const selectorPath = path.concat(['selector'])
    if (!isKeyed(selector) || ownValue(selector, 'by') !== 'index') {
      return failUnsupported(
        'decode',
        selectorPath,
        'reference',
        'References to ' +
          quote(plan.resource) +
          ' convert only by index: the app finds its objects by their position'
      )
    }
    for (const key of Object.keys(selector)) {
      if (key !== 'by' && key !== 'index') {
        fail('decode', selectorPath.concat([key]), 'Unexpected field ' + quote(key))
      }
    }
    const index = decodeInteger(ownValue(selector, 'index'), selectorPath.concat(['index']))
    if (index < 0) {
      fail('decode', selectorPath.concat(['index']), 'Expected a non-negative position')
    }
    if (!hasOwn(payload, 'container')) {
      fail('decode', path, 'Missing required field "container": a ' + quote(addressing.within))
    }
    const container = decodeReferencePayload(
      payload['container'],
      { kind: 'reference', resource: addressing.within, cardinality: 'one' },
      env,
      path.concat(['container']),
      true
    )
    if (env === undefined || !isHostObject(env.app)) {
      return failUnsupported(
        'decode',
        path,
        'reference',
        'References have no conversion without an application to address'
      )
    }
    return {
      pendingAddress: true,
      resource: plan.resource,
      addressing,
      id: index,
      container,
    }
  }

  /** The addressing the script's reference table gives `resource`, if any. */
  function addressingOf(env: Env, resource: string): NativeAddressing | undefined {
    if (env === undefined) return undefined
    const references = env.references
    const entry = hasOwn(references, resource) ? references[resource] : undefined
    return entry === undefined ? undefined : entry.addressing
  }

  /** The addressing of `resource` when its objects are found by position, else `undefined`. */
  function positionalAddressingOf(
    env: Env,
    resource: string
  ): NativePositionalAddressing | undefined {
    const addressing = addressingOf(env, resource)
    if (addressing === undefined) return undefined
    return addressing.lookup === 'byIndex' ? addressing : undefined
  }

  /**
   * The app's object a pending address names: its container first, when it
   * has one, then the object within it, exactly as a generated parent-scoped
   * get finds them. A missing container fails as missing, naming the
   * container's resource, before the object is looked up; a missing object
   * names its own resource.
   */
  function addressPending(app: HostObject, pending: PendingAddress, path: Path): HostObject {
    const owner =
      pending.container === undefined
        ? app
        : addressPending(app, pending.container, path.concat(['container']))
    return addressObject(owner, pending.addressing, pending.id, pending.resource, path)
  }

  /**
   * Decoding's second phase: replaces each pending address that the first
   * phase left in `value`, which `plan` describes, with the app's object it
   * names, in input order. The records and lists are the ones the first phase
   * built, so they are updated in place. A missing object fails as a missing
   * target.
   */
  function resolvePending(value: unknown, plan: ValuePlan, path: Path, env: Env): unknown {
    switch (plan.kind) {
      case 'reference': {
        if (!isPendingAddress(value) || env === undefined || !isHostObject(env.app)) {
          return fail('decode', path, 'Expected a converted reference')
        }
        return addressPending(env.app, value, path)
      }
      case 'array': {
        if (!Array.isArray(value)) return value
        const items: unknown[] = value
        for (let i = 0; i < items.length; i++) {
          items[i] = resolvePending(items[i], plan.items, path.concat([i]), env)
        }
        return items
      }
      case 'record': {
        if (!isKeyed(value)) return value
        for (const key of Object.keys(plan.fields)) {
          const field = plan.fields[key]
          if (field === undefined || !hasOwn(value, key)) continue
          setOwn(value, key, resolvePending(value[key], field.value, path.concat([key]), env))
        }
        return value
      }
      case 'nullable':
        return value === null ? null : resolvePending(value, plan.value, path, env)
      default:
        return value
    }
  }

  /** Whether a value is a {@link PendingAddress} left by decoding's first phase. */
  function isPendingAddress(value: unknown): value is PendingAddress {
    return isKeyed(value) && value['pendingAddress'] === true
  }

  /**
   * Encodes an app object at a reference position as the identity reference
   * that finds it again: its identifier is read as the resource's addressing
   * says and encoded by its identifier plan. A native read emits no selector.
   *
   * A resource found within a container (`addressing.within`) is encoded with
   * that container, which the body hands over with the value
   * ({@link containedValue}): the record the field was read through, never a
   * container asked of the object. The container is encoded in identity form
   * by the parent's own addressing and identifier plan, in the same request.
   * Only a top-level container is emitted: a parent that is itself found
   * within a container fails as unsupported, as do collections and resources
   * the app does not find by their identifier.
   */
  function encodeReference(native: unknown, plan: ReferencePlan, env: Env, path: Path): unknown {
    if (plan.cardinality !== 'one') {
      return failUnsupported(
        'encode',
        path,
        'reference',
        'Collection references have no conversion in this codec'
      )
    }
    if (plan.form === 'index') return encodeIndexSelector(native, plan, env, path)
    const plans = referencePlansOf('encode', env, plan.resource, path)
    const within = containerOf(plans.addressing)
    const held = within === undefined ? undefined : containedValue(native, plan.resource, path)
    const target = held === undefined ? native : held.value
    const payload = identityPayload(plan.resource, target, plans, env, path)
    if (within !== undefined && held !== undefined) {
      setOwn(payload, 'container', containerPayload(plan.resource, within, held, env, path))
    }
    const out: Record<string, unknown> = {}
    setOwn(out, KEY_REFERENCE, payload)
    return out
  }

  /**
   * Encodes an object of a positional resource at a position whose plan
   * records the index form, as the index selector within its container that
   * finds it again: its zero-based position is the one its own specifier
   * gives within the resource's collection of its container
   * (`env.positionOf`), never a dictionary `index` property, and its
   * container is the record it was read through ({@link containedValue}),
   * encoded as {@link containerPayload} does. A specifier that gives no
   * position fails as unsupported, as does a resource that is not
   * positional.
   */
  function encodeIndexSelector(
    native: unknown,
    plan: ReferencePlan,
    env: Env,
    path: Path
  ): unknown {
    const addressing = positionalAddressingOf(env, plan.resource)
    if (env === undefined || addressing === undefined) {
      return failUnsupported(
        'encode',
        path,
        'reference',
        'References to ' +
          quote(plan.resource) +
          ' have no index selector in this codec: the app does not find its objects by their position'
      )
    }
    const held = containedValue(native, plan.resource, path)
    if (!isHostObject(held.value)) {
      return fail(
        'encode',
        path,
        'Expected an object of ' + quote(plan.resource) + ', received ' + describeValue(held.value)
      )
    }
    const reader = env.positionOf
    const position: unknown =
      typeof reader === 'function' ? reader(held.value, addressing.collection) : undefined
    if (typeof position !== 'number' || !Number.isSafeInteger(position) || position < 0) {
      return failUnsupported(
        'encode',
        path,
        'reference',
        'The specifier the app returned for an object of ' +
          quote(plan.resource) +
          ' does not give its position within its container'
      )
    }
    const selector: Record<string, unknown> = {}
    setOwn(selector, 'by', 'index')
    setOwn(selector, 'index', encodeInteger(position, path.concat(['selector', 'index'])))
    const payload: Record<string, unknown> = {}
    setOwn(payload, 'resource', plan.resource)
    setOwn(payload, 'form', 'selector')
    setOwn(payload, 'cardinality', 'one')
    setOwn(payload, 'selector', selector)
    setOwn(
      payload,
      'container',
      containerPayload(plan.resource, addressing.within, held, env, path)
    )
    const out: Record<string, unknown> = {}
    setOwn(out, KEY_REFERENCE, payload)
    return out
  }

  /**
   * The identity payload of the container a body handed over with an object
   * of `resource`, which is found within a `within`: encoded by the parent's
   * own addressing and identifier plan, from the record's item or its
   * identifier already read. Only a top-level container is emitted: a parent
   * that is itself found within a container fails as unsupported.
   */
  function containerPayload(
    resource: string,
    within: string,
    held: { readonly container: unknown; readonly containerId: unknown },
    env: Env,
    path: Path
  ): Record<string, unknown> {
    const containerPath = path.concat(['container'])
    const parentPlans = referencePlansOf('encode', env, within, containerPath)
    if (containerOf(parentPlans.addressing) !== undefined) {
      return failUnsupported(
        'encode',
        containerPath,
        'reference',
        'References to ' +
          quote(resource) +
          ' within a ' +
          quote(within) +
          ' have no conversion in this codec: the ' +
          quote(within) +
          ' is itself found within a container'
      )
    }
    return held.containerId === undefined
      ? identityPayload(within, held.container, parentPlans, env, containerPath)
      : identityFromId(within, held.containerId, parentPlans, env, containerPath)
  }

  /**
   * What a body handed over at a position whose resource is found within a
   * container: the value the app returned there, and the record it was read
   * through, as the record's item (`container`) or its identifier already
   * read (`containerId`). A value with no record is a body that did not hand
   * over its container, a macts defect, so it fails as unsupported rather
   * than as the app's value: the codec never emits a reference without the
   * container its resource is found within.
   */
  function containedValue(
    native: unknown,
    resource: string,
    path: Path
  ): { readonly value: unknown; readonly container: unknown; readonly containerId: unknown } {
    const inner =
      soleKey(native) === KEY_CONTAINED && isKeyed(native) ? native[KEY_CONTAINED] : null
    if (!isPlainObject(inner) || !hasOwn(inner, 'value')) {
      return failUnsupported(
        'encode',
        path,
        'reference',
        'An object of ' +
          quote(resource) +
          ' came without the record it was read through, so its container cannot be encoded'
      )
    }
    return {
      value: inner['value'],
      container: ownValue(inner, 'container'),
      containerId: ownValue(inner, 'containerId'),
    }
  }

  /**
   * The identity payload of an app object of `resource`: its identifier read
   * as `plans.addressing` says, encoded by `plans.id`.
   */
  function identityPayload(
    resource: string,
    native: unknown,
    plans: { readonly id: ValuePlan; readonly addressing: NativeAddressing },
    env: Env,
    path: Path
  ): Record<string, unknown> {
    const expected = 'an object of ' + quote(resource)
    if (!isHostObject(native)) {
      return fail('encode', path, 'Expected ' + expected + ', received ' + describeValue(native))
    }
    if (plans.addressing.lookup === 'byRoot') {
      return failUnsupported(
        'encode',
        path,
        'reference',
        'References to ' +
          quote(resource) +
          ' have no conversion from the app: its objects do not say which kind they are'
      )
    }
    if (plans.addressing.lookup === 'byIndex') {
      return failUnsupported(
        'encode',
        path,
        'reference',
        'References to ' +
          quote(resource) +
          ' have no identity form: its objects have no identifier'
      )
    }
    const id = callMember('encode', native, plans.addressing.property, [], path, expected)
    return identityFromId(resource, id, plans, env, path)
  }

  /** The identity payload of the object of `resource` whose identifier is `id`. */
  function identityFromId(
    resource: string,
    id: unknown,
    plans: { readonly id: ValuePlan },
    env: Env,
    path: Path
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    setOwn(payload, 'resource', resource)
    setOwn(payload, 'form', 'identity')
    setOwn(payload, 'cardinality', 'one')
    setOwn(payload, 'id', encodeValue(id, plans.id, path.concat(['id']), env))
    return payload
  }

  /** Encodes a native value by its plan. */
  function encodeValue(native: unknown, plan: ValuePlan, path: Path, env: Env): unknown {
    const kind: string = plan.kind
    switch (plan.kind) {
      case 'passthrough':
        return native
      case 'none':
        return null
      case 'string':
        if (typeof native !== 'string') {
          fail('encode', path, 'Expected a string, received ' + describeValue(native))
        }
        return native
      case 'boolean':
        if (typeof native !== 'boolean') {
          fail('encode', path, 'Expected a boolean, received ' + describeValue(native))
        }
        return native
      case 'integer':
        return encodeInteger(native, path)
      case 'double':
        return encodeDouble(native, path)
      case 'date':
        return encodeDate(native, path)
      case 'point':
        return encodePoint(native, path)
      case 'rectangle':
        return encodeRectangle(native, path)
      case 'rgb':
        return encodeRgb(native, path)
      case 'enum':
        return checkMember('encode', native, plan.members, path)
      case 'array': {
        if (!isList(native)) {
          fail('encode', path, 'Expected a list, received ' + describeValue(native))
        }
        const items: unknown[] = []
        for (let i = 0; i < native.length; i++) {
          items.push(encodeValue(native[i], plan.items, path.concat([i]), env))
        }
        return items
      }
      case 'record':
        return encodeRecord(native, plan.fields, path, env)
      case 'nullable':
        // Missing value (`null`) is data here; absence (`undefined`) is not
        // representable outside a record field, so it fails in the inner plan.
        if (native === null) return null
        if (native === undefined) {
          return fail('encode', path, 'Absent values cannot be represented outside a record field')
        }
        return encodeValue(native, plan.value, path, env)
      case 'unknown':
        return encodeDynamic(native, path)
      case 'reference':
        return encodeReference(native, plan, env, path)
      case 'file':
      case 'file-source':
        return failUnsupported(
          'encode',
          path,
          kind,
          unconvertedKindName(kind) + ' values have no conversion in this codec'
        )
      default:
        return failUnsupported('encode', path, kind, 'Unrecognized value plan kind ' + quote(kind))
    }
  }

  // -------------------------------------------------------------------------
  // Leaf decoders: wire to native
  // -------------------------------------------------------------------------

  /**
   * The payload of a control record with exactly the one key `key`. A
   * control record with extra keys, or any other value, fails.
   */
  function controlPayload(wire: unknown, key: string, expected: string, path: Path): unknown {
    if (soleKey(wire) !== key || !isKeyed(wire)) {
      fail('decode', path, 'Expected ' + expected + ', received ' + describeValue(wire))
    }
    return wire[key]
  }

  /**
   * Decodes canonical integer text to a number. Text outside the safe domain
   * fails rather than rounding.
   */
  function decodeInteger(wire: unknown, path: Path): number {
    const text = controlPayload(wire, KEY_INTEGER, 'an integer', path)
    if (typeof text !== 'string' || !INTEGER_TEXT.test(text)) {
      fail(
        'decode',
        path,
        'Expected an integer in canonical decimal form (no sign on zero, no leading zeros, no "+"), received ' +
          describeValue(text)
      )
    }
    const value = Number(text)
    if (!Number.isSafeInteger(value)) {
      fail(
        'decode',
        path,
        'Integer ' + text + ' is outside the supported range -9007199254740991 to 9007199254740991'
      )
    }
    return value
  }

  /**
   * Decodes a double: a finite JSON number (a JSON `-0` is accepted) or one of
   * the explicit states.
   */
  function decodeDouble(wire: unknown, path: Path): number {
    const payload = controlPayload(wire, KEY_DOUBLE, 'a number', path)
    if (typeof payload === 'number') {
      if (!Number.isFinite(payload)) {
        fail('decode', path, 'Expected a finite number, received ' + describeValue(payload))
      }
      return payload
    }
    if (payload === STATE_NAN) return NaN
    if (payload === STATE_INFINITY) return Infinity
    if (payload === STATE_NEGATIVE_INFINITY) return -Infinity
    if (payload === STATE_NEGATIVE_ZERO) return -0
    return fail(
      'decode',
      path,
      'Expected a finite number or one of "NaN", "Infinity", "-Infinity", "-0", received ' +
        describeValue(payload)
    )
  }

  /** Days in a month of the proleptic Gregorian calendar, as `Date` uses. */
  function daysInMonth(year: number, month: number): number {
    if (month === 2) {
      const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
      return leap ? 29 : 28
    }
    return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31
  }

  /**
   * Decodes wire date-time text to a `Date`.
   *
   * @remarks
   * The text is parsed from its components rather than by the host's date
   * parser, so every field is range-checked (no rollover of, say, February 30
   * into March) and two-digit years are not reinterpreted. The result is the
   * same instant `new Date(text)` denotes for every valid input.
   */
  function decodeDate(wire: unknown, path: Path): Date {
    const text = controlPayload(wire, KEY_DATE, 'a date', path)
    const match = typeof text === 'string' ? DATE_TEXT.exec(text) : null
    const invalid =
      'Expected a date-time like 2026-10-31T17:04:05.120Z, with exactly three fractional digits and an offset of Z, +HH:MM, or -HH:MM, received ' +
      describeValue(text)
    if (match === null) return fail('decode', path, invalid)
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const hour = Number(match[4])
    const minute = Number(match[5])
    const second = Number(match[6])
    const millisecond = Number(match[7])
    const offsetSign = match[9] === '-' ? -1 : 1
    const offsetHours = match[8] === 'Z' ? 0 : Number(match[10])
    const offsetMinutes = match[8] === 'Z' ? 0 : Number(match[11])
    const valid =
      inRange(month, 1, 12) &&
      inRange(day, 1, daysInMonth(year, month)) &&
      inRange(hour, 0, 23) &&
      inRange(minute, 0, 59) &&
      inRange(second, 0, 59) &&
      inRange(offsetHours, 0, 23) &&
      inRange(offsetMinutes, 0, 59)
    if (!valid) return fail('decode', path, invalid)
    // `setUTCFullYear` takes the year literally; `Date.UTC` would map 0-99 to 1900-1999.
    const local = new Date(0)
    local.setUTCFullYear(year, month - 1, day)
    local.setUTCHours(hour, minute, second, millisecond)
    const offsetMs = offsetSign * (offsetHours * 60 + offsetMinutes) * 60000
    const date = new Date(local.getTime() - offsetMs)
    if (Number.isNaN(date.getTime())) return fail('decode', path, invalid)
    return date
  }

  /**
   * The members of a wire object that must have exactly the keys `keys`,
   * as when decoding geometry and colors.
   */
  function exactMembers(
    wire: unknown,
    keys: readonly string[],
    expected: string,
    path: Path
  ): Readonly<Record<string, unknown>> {
    if (!isKeyed(wire)) {
      return fail('decode', path, 'Expected ' + expected + ', received ' + describeValue(wire))
    }
    const present = Object.keys(wire)
    let matches = present.length === keys.length
    for (const key of keys) {
      if (!hasOwn(wire, key)) matches = false
    }
    if (!matches) {
      fail('decode', path, 'Expected ' + expected + ', received ' + describeValue(wire))
    }
    return wire
  }

  /** Decodes a point to a plain `{x, y}`. */
  function decodePoint(wire: unknown, path: Path): Record<string, number> {
    const members = exactMembers(wire, ['x', 'y'], 'a point with exactly the members x and y', path)
    return {
      x: decodeDouble(members['x'], path.concat(['x'])),
      y: decodeDouble(members['y'], path.concat(['y'])),
    }
  }

  /** Decodes a rectangle to a plain `{x, y, width, height}`. */
  function decodeRectangle(wire: unknown, path: Path): Record<string, number> {
    const members = exactMembers(
      wire,
      ['x', 'y', 'width', 'height'],
      'a rectangle with exactly the members x, y, width, and height',
      path
    )
    return {
      x: decodeDouble(members['x'], path.concat(['x'])),
      y: decodeDouble(members['y'], path.concat(['y'])),
      width: decodeDouble(members['width'], path.concat(['width'])),
      height: decodeDouble(members['height'], path.concat(['height'])),
    }
  }

  /**
   * Decodes an RGB color to the 16-bit channel list `[r, g, b]`.
   *
   * @remarks
   * This is the bridge form for apps whose interface uses 16-bit channel
   * lists. Other bridge forms, such as normalized `0..1` components, are
   * selected per app by future plan data.
   */
  function decodeRgb(wire: unknown, path: Path): number[] {
    const members = exactMembers(
      wire,
      ['r', 'g', 'b'],
      'a color with exactly the members r, g, and b',
      path
    )
    const channels: number[] = []
    for (const key of ['r', 'g', 'b']) {
      const channelPath = path.concat([key])
      channels.push(checkChannel('decode', decodeInteger(members[key], channelPath), channelPath))
    }
    return channels
  }

  // -------------------------------------------------------------------------
  // Structural decoders
  // -------------------------------------------------------------------------

  /**
   * Decodes a record by its planned fields. Every required field must be
   * present and no other key may appear. Absent optional fields stay absent,
   * and a present `null` stays as data.
   */
  function decodeRecord(
    wire: unknown,
    fields: Fields,
    path: Path,
    env: Env
  ): Record<string, unknown> {
    if (!isKeyed(wire)) {
      return fail('decode', path, 'Expected an object, received ' + describeValue(wire))
    }
    for (const key of Object.keys(wire)) {
      if (!hasOwn(fields, key)) {
        fail('decode', path.concat([key]), 'Unexpected field ' + quote(key))
      }
    }
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(fields)) {
      const field = fields[key]
      if (field === undefined) continue
      const fieldPath = path.concat([key])
      const value = ownValue(wire, key)
      if (value === undefined) {
        if (field.presence === 'required') {
          fail('decode', fieldPath, 'Missing required field ' + quote(key))
        }
        continue
      }
      setOwn(out, key, decodeValue(value, field.value, fieldPath, env))
    }
    return out
  }

  /**
   * Decodes self-describing dynamic content. Strings, booleans, and `null`
   * stand for themselves and lists hold encoded elements. Every object must
   * be a single-key integer, double, date, or record control record; any
   * other object, and any bare number, fails.
   */
  function decodeDynamic(wire: unknown, path: Path): unknown {
    if (wire === null || typeof wire === 'string' || typeof wire === 'boolean') return wire
    if (isList(wire)) {
      const items: unknown[] = []
      for (let i = 0; i < wire.length; i++) {
        items.push(decodeDynamic(wire[i], path.concat([i])))
      }
      return items
    }
    const key = soleKey(wire)
    if (key === KEY_INTEGER) return decodeInteger(wire, path)
    if (key === KEY_DOUBLE) return decodeDouble(wire, path)
    if (key === KEY_DATE) return decodeDate(wire, path)
    if (key === KEY_RECORD && isKeyed(wire)) {
      const payload = wire[KEY_RECORD]
      if (!isKeyed(payload)) {
        return fail(
          'decode',
          path,
          'Unrecognized value in dynamic content: a record must hold an object, received ' +
            describeValue(payload)
        )
      }
      const out: Record<string, unknown> = {}
      for (const name of Object.keys(payload)) {
        setOwn(out, name, decodeDynamic(payload[name], path.concat([name])))
      }
      return out
    }
    return fail(
      'decode',
      path,
      'Unrecognized value in dynamic content: expected a string, boolean, null, list, or an integer, double, date, or record value, received ' +
        describeValue(wire)
    )
  }

  /** Decodes a wire value by its plan. */
  function decodeValue(wire: unknown, plan: ValuePlan, path: Path, env: Env): unknown {
    const kind: string = plan.kind
    switch (plan.kind) {
      case 'passthrough':
        return wire
      case 'none':
        return undefined
      case 'string':
        if (typeof wire !== 'string') {
          fail('decode', path, 'Expected a string, received ' + describeValue(wire))
        }
        return wire
      case 'boolean':
        if (typeof wire !== 'boolean') {
          fail('decode', path, 'Expected a boolean, received ' + describeValue(wire))
        }
        return wire
      case 'integer':
        return decodeInteger(wire, path)
      case 'double':
        return decodeDouble(wire, path)
      case 'date':
        return decodeDate(wire, path)
      case 'point':
        return decodePoint(wire, path)
      case 'rectangle':
        return decodeRectangle(wire, path)
      case 'rgb':
        return decodeRgb(wire, path)
      case 'enum':
        return checkMember('decode', wire, plan.members, path)
      case 'array': {
        if (!isList(wire)) {
          fail('decode', path, 'Expected a list, received ' + describeValue(wire))
        }
        const items: unknown[] = []
        for (let i = 0; i < wire.length; i++) {
          items.push(decodeValue(wire[i], plan.items, path.concat([i]), env))
        }
        return items
      }
      case 'record':
        return decodeRecord(wire, plan.fields, path, env)
      case 'nullable':
        return wire === null ? null : decodeValue(wire, plan.value, path, env)
      case 'unknown':
        return decodeDynamic(wire, path)
      case 'reference':
        return decodeReference(wire, plan, env, path)
      case 'file':
      case 'file-source':
        return failUnsupported(
          'decode',
          path,
          kind,
          unconvertedKindName(kind) + ' values have no conversion in this codec'
        )
      default:
        return failUnsupported('decode', path, kind, 'Unrecognized value plan kind ' + quote(kind))
    }
  }

  return {
    decode: (wire, plan, env) => resolvePending(decodeValue(wire, plan, [], env), plan, [], env),
    encode: (native, plan, env) => encodeValue(native, plan, [], env),
    literals: {
      errorName: ERROR_NAME,
      integerLimits: { min: -INTEGER_MAX, max: INTEGER_MAX },
      rgbChannelMax: CHANNEL_MAX,
      wireKeys: {
        integer: KEY_INTEGER,
        double: KEY_DOUBLE,
        date: KEY_DATE,
        record: KEY_RECORD,
        reference: KEY_REFERENCE,
      },
      containedReference: KEY_CONTAINED,
      specialDoubleStates: [
        STATE_NAN,
        STATE_INFINITY,
        STATE_NEGATIVE_INFINITY,
        STATE_NEGATIVE_ZERO,
      ],
    },
  }
}
