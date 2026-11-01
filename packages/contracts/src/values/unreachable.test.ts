/**
 * Runtime tests for `UnreachableError`: it must report the unexpected value so
 * that a failure reached through an unchecked cast or a stale contract is
 * actionable.
 */

import { describe, expect, it } from 'vitest'
import { UnreachableError } from '../index.js'

/** Simulate a value that bypassed static types (for example through a cast). */
function bypass(value: unknown): never {
  return value as never
}

describe('UnreachableError', () => {
  it('names the unexpected value and the context in its message', () => {
    const error = new UnreachableError(bypass('postponed'), 'event status')

    expect(error.message).toContain('"postponed"')
    expect(error.message).toContain('event status')
    expect(error.value).toBe('postponed')
    expect(error.name).toBe('UnreachableError')
    expect(error).toBeInstanceOf(Error)
  })

  it('omits the context clause when none is given', () => {
    expect(new UnreachableError(bypass(7)).message).toMatch(/^Unexpected value 7: /)
  })

  it.each([
    [Number.NaN, 'NaN'],
    [-0, '-0'],
    [Number.POSITIVE_INFINITY, 'Infinity'],
    [undefined, 'undefined'],
    [10n, '10n'],
    [{ kind: 'x' }, '{"kind":"x"}'],
  ])('describes %s as %s', (value, description) => {
    expect(new UnreachableError(bypass(value)).message).toContain(`value ${description}`)
  })

  it('does not throw for values JSON cannot serialize', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic['self'] = cyclic

    expect(new UnreachableError(bypass(cyclic)).message).toContain('[unserializable value]')
  })
})
