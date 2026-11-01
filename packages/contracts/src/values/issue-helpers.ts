/**
 * Internal helpers for building value issues and their messages.
 *
 * Messages are user-facing: they describe what was received and what the
 * contract expects in terms of SDK and wire values only, never in terms of the
 * native automation layer. This module is not part of the package's public
 * surface.
 *
 * @packageDocumentation
 */

import type { IssuePath } from '../issues.js'
import type { ValueIssue, ValueIssueCode } from './value-issues.js'

/** Longest string excerpt quoted verbatim in a message. */
const MAX_QUOTED_STRING_LENGTH = 60

/** Build one issue. */
export function issue(path: IssuePath, code: ValueIssueCode, message: string): ValueIssue {
  return { path, code, message }
}

/** Render a number for a message, keeping the states `String` erases. */
export function formatNumber(value: number): string {
  return Object.is(value, -0) ? '-0' : String(value)
}

/** Quote a string for a message, truncating long values. */
export function quote(value: string): string {
  const excerpt =
    value.length > MAX_QUOTED_STRING_LENGTH ? `${value.slice(0, MAX_QUOTED_STRING_LENGTH)}…` : value
  return JSON.stringify(excerpt)
}

/**
 * Describe a received value in a short phrase, for example `the number 1.5`,
 * `null`, or `an array`. Object contents are never rendered, so messages stay
 * short and never echo large or sensitive payloads.
 */
export function describeReceived(value: unknown): string {
  switch (typeof value) {
    case 'string':
      return `the string ${quote(value)}`
    case 'number':
      return `the number ${formatNumber(value)}`
    case 'boolean':
      return `the boolean ${String(value)}`
    case 'bigint':
      return `the bigint ${value.toString()}n`
    case 'symbol':
      return 'a symbol'
    case 'function':
      return 'a function'
    case 'undefined':
      return 'undefined'
    case 'object':
      return describeObject(value)
  }
}

function describeObject(value: object | null): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'an array'
  if (value instanceof Date) return 'a Date'
  const prototype: unknown = Object.getPrototypeOf(value)
  if (prototype === null || prototype === Object.prototype) {
    const keys = Object.keys(value)
    return keys.length === 0
      ? 'an empty object'
      : `an object with keys ${keys.slice(0, 5).map(quote).join(', ')}${keys.length > 5 ? ', …' : ''}`
  }
  const name = constructorName(prototype)
  return name === undefined ? 'an object' : `an instance of ${name}`
}

function constructorName(prototype: unknown): string | undefined {
  if (typeof prototype !== 'object' || prototype === null) return undefined
  const ctor: unknown = Object.getOwnPropertyDescriptor(prototype, 'constructor')?.value
  return typeof ctor === 'function' && ctor.name !== '' ? ctor.name : undefined
}

/**
 * Render a path for a message, for example `events[0].status`. The empty path
 * renders as `the value`.
 */
export function formatPath(path: IssuePath): string {
  if (path.length === 0) return 'the value'
  let rendered = ''
  for (const segment of path) {
    if (typeof segment === 'number') {
      rendered += `[${String(segment)}]`
    } else if (/^[A-Za-z_$][\w$]*$/.test(segment)) {
      rendered += rendered === '' ? segment : `.${segment}`
    } else {
      rendered += `[${JSON.stringify(segment)}]`
    }
  }
  return rendered
}

/** Whether a value is a plain object: created by `{}` or with a null prototype. */
export function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

/**
 * Define an own, enumerable data property. Used instead of assignment so that
 * keys such as `__proto__` become ordinary data rather than changing an
 * object's prototype.
 */
export function defineField(target: object, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  })
}
