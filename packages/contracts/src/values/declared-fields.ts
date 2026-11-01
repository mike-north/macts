/**
 * Internal rule for which properties of a handle-like value a codec reads and
 * which it rejects: the one strictness rule shared by references and file
 * sources.
 *
 * Each variant of such a value (an identity reference, a name selector, an
 * uploaded file, …) declares its SDK fields. In the two directions:
 *
 * - **Encoding** reads the declared fields by property access, so class
 *   instances and accessors are accepted. It ignores function-valued members
 *   (such as a bound reference's `resolve`) and anything that is not an own
 *   enumerable property (prototype members, `#private` fields, non-enumerable
 *   properties). Any other own enumerable property is an `unknown-field`
 *   issue at its key: it is data the contract does not carry, most often a
 *   typo or a field of a sibling variant.
 * - **Decoding** reads plain JSON objects only and rejects every key the wire
 *   form does not declare.
 *
 * A key that belongs to a sibling variant (an identity reference with a
 * `selector`, an uploaded file with a `path`) gets a message that says which
 * variant it belongs to, rather than a bare "not a field".
 *
 * This module is not part of the package's public surface.
 *
 * @packageDocumentation
 */

import type { IssuePath } from '../issues.js'
import type { Issues } from './codec.js'
import { issue, isPlainObject, quote } from './issue-helpers.js'

/** The fields one variant declares, and why sibling variants' keys are not among them. */
export interface DeclaredFields {
  /** The variant, with its article, for messages: for example `an identity reference`. */
  readonly label: string
  /** The keys the variant declares. */
  readonly fields: readonly string[]
  /** For keys of sibling variants: why this variant does not have them. */
  readonly misplaced: Readonly<Record<string, string>>
}

/** Declare a variant's fields; see {@link DeclaredFields}. */
export function declaredFields(
  label: string,
  fields: readonly string[],
  misplaced: Readonly<Record<string, string>> = {}
): DeclaredFields {
  return Object.freeze({
    label,
    fields: Object.freeze([...fields]),
    misplaced: Object.freeze({ ...misplaced }),
  })
}

/** The fields of one object being read, by key. */
export interface FieldReader {
  /** The value of `key`, or `undefined` when it is absent. */
  readonly read: (key: string) => unknown
  /**
   * Report every property outside `declared` that the direction rejects, as
   * an `unknown-field` issue at its key. Returns whether any was reported.
   */
  rejectUnknown(declared: DeclaredFields, path: IssuePath, issues: Issues): boolean
}

/**
 * Open an SDK value for encoding: any non-null, non-array object. Returns
 * `undefined` for anything else, so the caller can report the mismatch in its
 * own terms.
 */
export function openSdkObject(value: unknown): FieldReader | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const source: object = value
  // Declared fields may be accessors, including on a class prototype, so they
  // are read as properties rather than as own data.
  const read = (key: string): unknown => Reflect.get(source, key)
  return {
    read,
    rejectUnknown(declared, path, issues) {
      let found = false
      for (const key of Object.keys(source)) {
        if (declared.fields.includes(key) || typeof read(key) === 'function') continue
        found = true
        issues.push(unknownField(declared, key, path))
      }
      return found
    },
  }
}

/**
 * Open a wire value for decoding: a plain JSON object only. Returns
 * `undefined` for anything else.
 */
export function openWireObject(value: unknown): FieldReader | undefined {
  if (!isPlainObject(value)) return undefined
  const source = value
  return {
    // JSON cannot carry `undefined`, so an absent key and an own `undefined`
    // (possible only in-process) both read as absent.
    read: (key) => (Object.hasOwn(source, key) ? source[key] : undefined),
    rejectUnknown(declared, path, issues) {
      let found = false
      for (const key of Object.keys(source)) {
        if (declared.fields.includes(key)) continue
        found = true
        issues.push(unknownField(declared, key, path))
      }
      return found
    },
  }
}

function unknownField(declared: DeclaredFields, key: string, path: IssuePath) {
  const reason = Object.hasOwn(declared.misplaced, key) ? declared.misplaced[key] : undefined
  return issue(
    [...path, key],
    'unknown-field',
    reason === undefined
      ? `${quote(key)} is not a field of ${declared.label} (its fields are ` +
          `${declared.fields.map(quote).join(', ')}).`
      : `${capitalize(declared.label)} has no ${quote(key)}: ${reason}.`
  )
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
