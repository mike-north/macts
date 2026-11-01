/**
 * JSON wire forms of macts values.
 *
 * The wire format is what crosses every serialization boundary: the native
 * process boundary, HTTP, and MCP. SDK callers never see these shapes; codecs
 * translate between them and SDK values.
 *
 * Every value whose wire form is not a JSON string, boolean, `null`, array, or
 * schema-declared record travels as a **control record**: a single-key JSON
 * object whose key names the value kind. Numbers are always control records, so
 * a number's classification (integer or double) and non-finite states survive
 * serialization.
 *
 * Control records cannot be confused with user data. At schema-typed positions
 * the decoder knows what it expects; inside dynamic (`unknown`) content every
 * JSON object must be a control record, and user records travel inside a
 * {@link DynamicRecordWire} envelope.
 *
 * @packageDocumentation
 */

import type { FileSourceWire, FileWire } from '../files/index.js'
import type { ReferenceWire } from '../references/index.js'

/**
 * The control-record keys, one per wire value kind.
 *
 * @remarks
 * These spellings are part of the wire protocol. They carry no `$` prefix
 * because JSON-Schema tooling treats `$`-prefixed names such as `$ref`
 * specially, even as property names.
 */
export const WIRE_KEYS = Object.freeze({
  integer: 'integer',
  double: 'double',
  date: 'date',
  record: 'record',
  reference: 'reference',
  file: 'file',
  fileSource: 'fileSource',
} as const)

/**
 * The double states that plain JSON numbers cannot carry: the non-finite values
 * and negative zero.
 */
export const SPECIAL_DOUBLE_STATES = Object.freeze(['NaN', 'Infinity', '-Infinity', '-0'] as const)

/** One of {@link SPECIAL_DOUBLE_STATES}. */
export type SpecialDoubleState = (typeof SPECIAL_DOUBLE_STATES)[number]

/** Any JSON-compatible value. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }

/**
 * A value in wire form.
 *
 * @remarks
 * Structurally any JSON value. Which shapes are valid at a given position is
 * defined by that position's wire schema. A bare JSON number is never valid on
 * its own: numbers appear only as the payload of a {@link WireDouble}.
 */
export type WireValue = JsonValue

/**
 * An operation input record in wire form.
 *
 * @remarks
 * Operation input is always record-shaped: keys are the operation's parameter
 * names and each value is that parameter's wire value. Absent optional
 * parameters have no key.
 */
export type WireRecord = Readonly<Record<string, WireValue>>

/**
 * An integer, carried as canonical decimal text.
 *
 * @remarks
 * The payload matches `^(0|-?[1-9][0-9]*)$`: no sign on zero, no leading zeros,
 * no `+`. Its magnitude must lie within the SDK integer domain.
 */
export interface WireInteger {
  /** Canonical decimal text of the integer. */
  readonly integer: string
}

/**
 * A double-precision number.
 *
 * @remarks
 * A finite value other than negative zero is a JSON number. `NaN`, the
 * infinities, and `-0` are explicit {@link SpecialDoubleState} strings. A double
 * whose value happens to be integral (for example `3`) is still a double.
 */
export interface WireDouble {
  /** Finite JSON number, or a special state. */
  readonly double: number | SpecialDoubleState
}

/** Any numeric wire value. */
export type WireNumber = WireInteger | WireDouble

/**
 * A point in time.
 *
 * @remarks
 * The payload is ISO 8601 with exactly three fractional digits and an explicit
 * offset (`Z` or `±HH:MM`), for example `2026-10-31T17:04:05.120Z`. Encoders
 * emit `Z`.
 */
export interface WireDate {
  /** ISO 8601 date-time text. */
  readonly date: string
}

/** A reference to app objects; see the references module for the payload. */
export interface WireReference {
  /** The reference payload. */
  readonly reference: ReferenceWire
}

/** A file or binary content returned by an operation. */
export interface WireFile {
  /** The file metadata payload. */
  readonly file: FileWire
}

/** A source of bytes supplied to an operation that writes a file. */
export interface WireFileSource {
  /** The source payload. */
  readonly fileSource: FileSourceWire
}

/**
 * Envelope for a user record inside dynamic content.
 *
 * @remarks
 * Within an `unknown` position, the keys of the payload are the user's own and
 * each value is itself a {@link DynamicWireValue}. The envelope is what keeps a
 * user record shaped like a control record from being decoded as one.
 */
export interface DynamicRecordWire {
  /** The user's record, with every value encoded recursively. */
  readonly record: Readonly<Record<string, DynamicWireValue>>
}

/**
 * A value in dynamic content, where no schema describes the shape.
 *
 * @remarks
 * Strings, booleans, and `null` stand for themselves; arrays hold encoded
 * elements; every object is a control record. Numbers of unknown native
 * classification are encoded as doubles.
 */
export type DynamicWireValue =
  | string
  | boolean
  | null
  | WireInteger
  | WireDouble
  | WireDate
  | WireReference
  | WireFile
  | DynamicRecordWire
  | readonly DynamicWireValue[]
