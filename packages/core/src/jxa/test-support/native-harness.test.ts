/**
 * The test harness reads native outcomes exactly as the native executor does.
 *
 * Tests that run composed scripts read what they print with the harness's
 * `parseNativeOutcome`. It must refuse every outcome the executor's own
 * reader refuses as malformed, or a test could pass on an outcome that real
 * execution would reject.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D4)
 */

import { describe, expect, it } from 'vitest'
import { parseNativeOutcome } from './native-harness.js'

/** The printed outcome of a failed script whose failure is `failure`. */
function failedWith(failure: Record<string, unknown>): string {
  return JSON.stringify({ ok: false, failure })
}

const CODEC_FAILURE = {
  source: 'codec',
  direction: 'decode',
  path: ['for'],
  message: 'A message',
} as const

describe('parseNativeOutcome (test harness)', () => {
  // Regression: the harness accepted a codec failure marked both unsupported
  // and missing, which the executor refuses as malformed.
  it('refuses a codec failure that is both unsupported and missing, as the executor does', () => {
    expect(() =>
      parseNativeOutcome(
        failedWith({ ...CODEC_FAILURE, unsupportedKind: 'reference', missingResource: 'Person' })
      )
    ).toThrow('Malformed native outcome: the codec failure is both unsupported and missing')
  })

  it('accepts a codec failure that is only unsupported, or only missing', () => {
    expect(
      parseNativeOutcome(failedWith({ ...CODEC_FAILURE, unsupportedKind: 'reference' }))
    ).toEqual({ ok: false, failure: { ...CODEC_FAILURE, unsupportedKind: 'reference' } })
    expect(parseNativeOutcome(failedWith({ ...CODEC_FAILURE, missingResource: 'Person' }))).toEqual(
      { ok: false, failure: { ...CODEC_FAILURE, missingResource: 'Person' } }
    )
  })

  it.each([
    ['a non-text unsupported kind', { ...CODEC_FAILURE, unsupportedKind: 7 }],
    ['a non-text missing resource', { ...CODEC_FAILURE, missingResource: 7 }],
    [
      'an app failure with a non-numeric error number',
      { source: 'app', message: 'x', errorNumber: '-1728' },
    ],
    ['an unknown source', { source: 'elsewhere', message: 'x' }],
  ])('refuses %s, as the executor does', (_label, failure) => {
    expect(() => parseNativeOutcome(failedWith(failure))).toThrow('Malformed native outcome: ')
  })
})
