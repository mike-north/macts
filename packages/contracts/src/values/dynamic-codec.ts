/**
 * Internal codec for dynamic content: values at `unknown` positions, whose
 * shape no contract describes.
 *
 * Dynamic wire content is self-describing. Strings, booleans, and `null`
 * stand for themselves; arrays hold encoded elements; every object is a
 * control record, and a user record travels inside a `{ "record": { … } }`
 * envelope so that user data can never impersonate a control record.
 * Issue paths name locations in the user's data: the envelope is wire
 * structure and contributes no path segment, so encode and decode report the
 * same path for the same location.
 *
 * Numbers in dynamic content encode as doubles. Integer provenance is not
 * observable for a plain JavaScript number, and integrality is never treated
 * as evidence of it. Integer control records still decode, to numbers.
 *
 * References, file values, and file sources cannot be represented in dynamic
 * content: they appear only at typed positions, whose contracts name the
 * resource or the file kind. Their control records are rejected as
 * `unsupported`. On the encode side there is nothing to reject by shape: a
 * plain object shaped like a file source or a reference descriptor is a user
 * record, and travels enveloped like any other.
 *
 * Absence is never materialized as `null`. A record value holding `undefined`
 * is absent and omitted; `undefined` anywhere else (at the root, or as an
 * array element or hole) has no wire form and is rejected as `unsupported`.
 *
 * This module is not part of the package's public surface.
 *
 * @packageDocumentation
 */

import type { IssuePath } from '../issues.js'
import { INVALID, mismatch, type Codec, type Invalid, type Issues } from './codec.js'
import { DATE_CODEC, DOUBLE_CODEC, integerCodec } from './leaf-codecs.js'
import { defineField, describeReceived, issue, isPlainObject, quote } from './issue-helpers.js'
import { DYNAMIC_TYPED_ONLY_MESSAGE, checkDateValue, doublePayload } from './wire-checks.js'
import type { DecodeContext } from './value-type.js'
import type { WireValue } from './wire.js'

const INTEGER = integerCodec()

const REPRESENTABLE =
  'Dynamic content can hold strings, numbers, booleans, null, Dates, arrays, and plain objects.'

/** Codec for dynamic content. */
export const DYNAMIC_CODEC: Codec<unknown> = {
  encode: (value, path, issues) => encodeDynamic(value, path, issues, new Set()),
  decode: (wire, path, context, issues) => decodeDynamic(wire, path, context, issues),
}

/**
 * Encode a dynamic SDK value. `ancestors` holds the arrays and objects that
 * contain `value`, so a circular structure is reported rather than followed
 * forever.
 */
function encodeDynamic(
  value: unknown,
  path: IssuePath,
  issues: Issues,
  ancestors: Set<object>
): WireValue | Invalid {
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value
    case 'number':
      return { double: doublePayload(value) }
    case 'undefined':
      // Record values holding `undefined` are omitted before reaching here, so
      // this is absence at the root or in an array, which has no wire form.
      issues.push(
        issue(
          path,
          'unsupported',
          'Absent values cannot be represented outside a record field: undefined in dynamic ' +
            'content is only meaningful as an omitted record value. Use null for an explicit empty value.'
        )
      )
      return INVALID
    case 'bigint':
    case 'symbol':
    case 'function':
      issues.push(
        issue(
          path,
          'unsupported',
          `${capitalize(describeReceived(value))} cannot be represented. ${REPRESENTABLE}`
        )
      )
      return INVALID
    case 'object':
      return encodeDynamicObject(value, path, issues, ancestors)
  }
}

function encodeDynamicObject(
  value: object | null,
  path: IssuePath,
  issues: Issues,
  ancestors: Set<object>
): WireValue | Invalid {
  if (value === null) return null
  if (value instanceof Date) {
    const result = checkDateValue(value)
    if (result.ok) return { date: result.value }
    issues.push(issue(path, result.code, result.message))
    return INVALID
  }
  if (ancestors.has(value)) {
    issues.push(
      issue(
        path,
        'unsupported',
        'The value contains itself (a circular structure), which cannot be represented.'
      )
    )
    return INVALID
  }
  if (Array.isArray(value)) {
    const items: readonly unknown[] = value
    ancestors.add(value)
    const encoded: WireValue[] = []
    let valid = true
    for (const [index, item] of items.entries()) {
      const wire = encodeDynamic(item, [...path, index], issues, ancestors)
      if (wire === INVALID) valid = false
      else encoded.push(wire)
    }
    ancestors.delete(value)
    return valid ? encoded : INVALID
  }
  if (isPlainObject(value)) {
    ancestors.add(value)
    const fields = {}
    let valid = true
    for (const key of Object.keys(value)) {
      const field = value[key]
      if (field === undefined) continue
      const wire = encodeDynamic(field, [...path, key], issues, ancestors)
      if (wire === INVALID) valid = false
      else defineField(fields, key, wire)
    }
    ancestors.delete(value)
    return valid ? { record: fields } : INVALID
  }
  issues.push(
    issue(
      path,
      'unsupported',
      `${capitalize(describeReceived(value))} cannot be represented. ${REPRESENTABLE}`
    )
  )
  return INVALID
}

function decodeDynamic(
  wire: unknown,
  path: IssuePath,
  context: DecodeContext,
  issues: Issues
): unknown {
  if (typeof wire === 'string' || typeof wire === 'boolean' || wire === null) return wire
  if (typeof wire === 'number') {
    issues.push(
      issue(
        path,
        'invalid-type',
        `Bare numbers are not dynamic values; received ${describeReceived(wire)}. Numbers travel as ` +
          '{"double": …} or {"integer": "…"} control records.'
      )
    )
    return INVALID
  }
  if (Array.isArray(wire)) {
    const items: readonly unknown[] = wire
    const decoded: unknown[] = []
    let valid = true
    for (const [index, item] of items.entries()) {
      const value = decodeDynamic(item, [...path, index], context, issues)
      if (value === INVALID) valid = false
      else decoded.push(value)
    }
    return valid ? decoded : INVALID
  }
  if (!isPlainObject(wire)) return mismatch(wire, path, issues, 'a dynamic wire value')

  const keys = Object.keys(wire)
  const [key] = keys
  if (keys.length !== 1 || key === undefined) {
    issues.push(
      issue(
        path,
        'invalid-control-record',
        'Every object in dynamic content must be a single-key control record, with user records ' +
          `inside {"record": {…}}; received ${describeReceived(wire)}.`
      )
    )
    return INVALID
  }
  switch (key) {
    case 'integer':
      return INTEGER.decode(wire, path, context, issues)
    case 'double':
      return DOUBLE_CODEC.decode(wire, path, context, issues)
    case 'date':
      return DATE_CODEC.decode(wire, path, context, issues)
    case 'record':
      // The envelope is wire structure, not user data, so it adds no path segment.
      return decodeEnvelope(wire[key], path, context, issues)
    case 'reference':
    case 'file':
    case 'fileSource':
      issues.push(issue(path, 'unsupported', DYNAMIC_TYPED_ONLY_MESSAGE))
      return INVALID
    default:
      issues.push(
        issue(
          path,
          'invalid-control-record',
          `${quote(key)} is not a control-record key. User records in dynamic content travel inside ` +
            '{"record": {…}}.'
        )
      )
      return INVALID
  }
}

/** Decode the payload of a `record` envelope into a plain object. */
function decodeEnvelope(
  payload: unknown,
  path: IssuePath,
  context: DecodeContext,
  issues: Issues
): unknown {
  if (!isPlainObject(payload)) {
    issues.push(
      issue(
        path,
        'invalid-control-record',
        `A record envelope must hold an object of dynamic values; received ${describeReceived(payload)}.`
      )
    )
    return INVALID
  }
  const record = {}
  let valid = true
  for (const key of Object.keys(payload)) {
    const value = decodeDynamic(payload[key], [...path, key], context, issues)
    if (value === INVALID) valid = false
    else defineField(record, key, value)
  }
  return valid ? record : INVALID
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
