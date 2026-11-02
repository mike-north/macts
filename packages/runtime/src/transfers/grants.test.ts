/**
 * File grants: issued when an authorized operation returns a file, bound to
 * the subject they were issued to, reusable until they expire.
 *
 * Expected values come from phases/13 D8 ("Grants", "Limits and lifecycle")
 * and the documented limits: a grant lives 15 minutes, and a transfer is
 * expired at its `expiresAt` instant.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D8)
 */

import { describe, expect, it } from 'vitest'
import { hashToken } from './tokens.js'
import {
  ALICE,
  BOB,
  MINUTE,
  expectIndistinguishable,
  expectTransferError,
  useTransferStore,
} from './transfer-test-helpers.js'

const OBSERVED_AT = new Date('2026-01-15T09:59:30.000Z')
const FILE = { app: 'finder', path: '/Users/alice/report.pdf', observedAt: OBSERVED_AT }

describe('issueGrant', () => {
  const fixture = useTransferStore()

  it('issues an opaque 32-byte base64url token that expires 15 minutes from now', async () => {
    const grant = await fixture.store.issueGrant(ALICE, FILE)

    // 32 random bytes in base64url without padding is 43 characters.
    expect(grant.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(grant.expiresAt).toEqual(new Date('2026-01-15T10:15:00.000Z'))
  })

  it('issues a different token every time', async () => {
    const first = await fixture.store.issueGrant(ALICE, FILE)
    const second = await fixture.store.issueGrant(ALICE, FILE)
    expect(first.token).not.toBe(second.token)
  })

  it('rejects an empty subject as a programming error', async () => {
    await expect(fixture.store.issueGrant('', FILE)).rejects.toThrow(TypeError)
  })

  it('rejects a file without an app or with an invalid observation date', async () => {
    await expect(fixture.store.issueGrant(ALICE, { ...FILE, app: '' })).rejects.toThrow(TypeError)
    await expect(
      fixture.store.issueGrant(ALICE, { ...FILE, observedAt: new Date(Number.NaN) })
    ).rejects.toThrow(TypeError)
  })
})

describe('redeemGrant', () => {
  const fixture = useTransferStore()

  it('returns the granted file and its expiry', async () => {
    const { token } = await fixture.store.issueGrant(ALICE, FILE)

    await expect(fixture.store.redeemGrant(ALICE, token)).resolves.toEqual({
      app: 'finder',
      path: '/Users/alice/report.pdf',
      observedAt: OBSERVED_AT,
      expiresAt: new Date('2026-01-15T10:15:00.000Z'),
    })
  })

  it('omits path for content that has none', async () => {
    const { token } = await fixture.store.issueGrant(ALICE, {
      app: 'photos',
      observedAt: OBSERVED_AT,
    })
    const record = await fixture.store.redeemGrant(ALICE, token)
    expect(record).not.toHaveProperty('path')
    expect(record.app).toBe('photos')
  })

  it('is reusable until expiry', async () => {
    const { token } = await fixture.store.issueGrant(ALICE, FILE)
    await fixture.store.redeemGrant(ALICE, token)
    fixture.clock.advance(10 * MINUTE)
    await expect(fixture.store.redeemGrant(ALICE, token)).resolves.toMatchObject({ app: 'finder' })
  })

  it('fails with unknown-transfer for a token never issued', async () => {
    await expectTransferError(
      fixture.store.redeemGrant(ALICE, 'not-a-real-token'),
      'unknown-transfer'
    )
  })

  it('treats a token presented by another subject exactly like an unknown token', async () => {
    const { token } = await fixture.store.issueGrant(ALICE, FILE)

    const wrongSubject = await expectTransferError(
      fixture.store.redeemGrant(BOB, token),
      'unknown-transfer'
    )
    const unknown = await expectTransferError(
      fixture.store.redeemGrant(BOB, 'never-issued'),
      'unknown-transfer'
    )
    expectIndistinguishable(wrongSubject, unknown)
  })

  it('reports unknown-transfer, not expired, to another subject after expiry', async () => {
    const { token } = await fixture.store.issueGrant(ALICE, FILE)
    fixture.clock.advance(20 * MINUTE)
    await expectTransferError(fixture.store.redeemGrant(BOB, token), 'unknown-transfer')
  })

  it('is usable one millisecond before expiry and expired exactly at expiresAt', async () => {
    const { token, expiresAt } = await fixture.store.issueGrant(ALICE, FILE)

    fixture.clock.set(new Date(expiresAt.getTime() - 1))
    await expect(fixture.store.redeemGrant(ALICE, token)).resolves.toMatchObject({ app: 'finder' })

    fixture.clock.set(expiresAt)
    await expectTransferError(fixture.store.redeemGrant(ALICE, token), 'expired')
  })

  it('never puts the token in an error message', async () => {
    const { token } = await fixture.store.issueGrant(ALICE, FILE)
    const wrongSubject = await expectTransferError(
      fixture.store.redeemGrant(BOB, token),
      'unknown-transfer'
    )
    fixture.clock.advance(15 * MINUTE)
    const expired = await expectTransferError(fixture.store.redeemGrant(ALICE, token), 'expired')

    for (const error of [wrongSubject, expired]) {
      expect(error.message).not.toContain(token)
      expect(error.message).not.toContain(hashToken(token))
    }
  })
})
