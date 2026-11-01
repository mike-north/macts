/**
 * Tests for the self-redacting credential holder.
 *
 * The contract (phases/13 D5) is that a credential redacts itself in
 * `toString`, `toJSON`, and `util.inspect`, so it cannot leak into logs,
 * errors, or audit records, and that only `reveal()` yields the secret.
 *
 * @see https://nodejs.org/api/util.html#custom-inspection-functions-on-objects
 */

import { inspect } from 'node:util'
import { describe, expect, it } from 'vitest'
import { createBearerCredential } from './credential.js'

const SECRET = 'macts_sk_header.payload.signature-never-printed'
const PLACEHOLDER = '[redacted credential]'

describe('createBearerCredential', () => {
  it('presents the secret under the bearer scheme through reveal()', () => {
    const credential = createBearerCredential(SECRET)
    expect(credential.scheme).toBe('bearer')
    expect(credential.reveal()).toBe(SECRET)
  })

  it('renders as the placeholder through String()', () => {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- stringifying the credential is what is under test
    expect(String(createBearerCredential(SECRET))).toBe(PLACEHOLDER)
  })

  it('renders as the placeholder in template literals', () => {
    const credential = createBearerCredential(SECRET)
    // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions -- formatting the credential is what is under test
    expect(`${credential}`).toBe(PLACEHOLDER)
  })

  it('serializes as the placeholder, including when nested', () => {
    const credential = createBearerCredential(SECRET)
    const json = JSON.stringify({ c: credential })
    expect(json).toBe(`{"c":"${PLACEHOLDER}"}`)
    expect(json).not.toContain(SECRET)
  })

  it('inspects as the placeholder, including when nested', () => {
    const credential = createBearerCredential(SECRET)
    expect(inspect(credential)).toContain(PLACEHOLDER)
    expect(inspect(credential)).not.toContain(SECRET)
    expect(inspect({ context: { credential } }, { depth: 10 })).not.toContain(SECRET)
  })

  it('exposes no enumerable property holding the secret', () => {
    const credential = createBearerCredential(SECRET)
    expect(Object.keys(credential)).toEqual(['scheme'])
    expect(Object.values(credential)).not.toContain(SECRET)
    expect(Object.getOwnPropertyNames(credential)).not.toContain('secret')
  })

  it('keeps an empty secret as given, for verification to reject', () => {
    expect(createBearerCredential('').reveal()).toBe('')
  })
})
