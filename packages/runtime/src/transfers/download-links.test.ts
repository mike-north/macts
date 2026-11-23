/**
 * Download links: short-lived bearer capabilities, issued in exchange for a
 * grant, that resolve to the granted file without naming a subject.
 *
 * Expected values come from phases/13 D8 ("SignedDownload", "Grants") and the
 * documented limits: a link lives 5 minutes, and a transfer is expired at its
 * `expiresAt`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D8)
 */

import { describe, expect, it } from 'vitest'
import {
  ALICE,
  BOB,
  MINUTE,
  expectIndistinguishable,
  expectTransferError,
  useTransferStore,
} from './transfer-test-helpers.js'

const FILE = {
  app: 'mail',
  path: '/Users/alice/Library/Mail/attachment.png',
  observedAt: new Date('2026-01-15T09:58:00.000Z'),
}

describe('issueDownloadLink', () => {
  const fixture = useTransferStore()

  it('issues an opaque token that expires 5 minutes from now', async () => {
    const grant = await fixture.store.issueGrant(ALICE, FILE)

    const link = await fixture.store.issueDownloadLink(ALICE, grant.token)

    expect(link.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(link.token).not.toBe(grant.token)
    expect(link.expiresAt).toEqual(new Date('2026-01-15T10:05:00.000Z'))
  })

  it('issues a fresh link on every call while the grant lives', async () => {
    const grant = await fixture.store.issueGrant(ALICE, FILE)
    const first = await fixture.store.issueDownloadLink(ALICE, grant.token)
    fixture.clock.advance(MINUTE)
    const second = await fixture.store.issueDownloadLink(ALICE, grant.token)

    expect(second.token).not.toBe(first.token)
    expect(second.expiresAt).toEqual(new Date('2026-01-15T10:06:00.000Z'))
    await expect(fixture.store.redeemDownloadLink(first.token)).resolves.toEqual({
      app: 'mail',
      path: FILE.path,
    })
  })

  it('fails like redeemGrant for another subject or an unknown grant, indistinguishably', async () => {
    const grant = await fixture.store.issueGrant(ALICE, FILE)

    const wrongSubject = await expectTransferError(
      fixture.store.issueDownloadLink(BOB, grant.token),
      'unknown-transfer'
    )
    const unknown = await expectTransferError(
      fixture.store.issueDownloadLink(BOB, 'never-issued'),
      'unknown-transfer'
    )
    expectIndistinguishable(wrongSubject, unknown)
  })

  it('fails with expired once the grant has expired', async () => {
    const grant = await fixture.store.issueGrant(ALICE, FILE)
    fixture.clock.set(grant.expiresAt)
    await expectTransferError(fixture.store.issueDownloadLink(ALICE, grant.token), 'expired')
  })
})

describe('redeemDownloadLink', () => {
  const fixture = useTransferStore()

  it('resolves to the granted file, with no subject required', async () => {
    const grant = await fixture.store.issueGrant(ALICE, FILE)
    const link = await fixture.store.issueDownloadLink(ALICE, grant.token)

    await expect(fixture.store.redeemDownloadLink(link.token)).resolves.toEqual({
      app: 'mail',
      path: '/Users/alice/Library/Mail/attachment.png',
    })
  })

  it('omits path for content that has none', async () => {
    const grant = await fixture.store.issueGrant(ALICE, {
      app: 'photos',
      observedAt: FILE.observedAt,
    })
    const link = await fixture.store.issueDownloadLink(ALICE, grant.token)
    await expect(fixture.store.redeemDownloadLink(link.token)).resolves.toEqual({ app: 'photos' })
  })

  it('outlives the grant it was issued from, up to its own expiry', async () => {
    const grant = await fixture.store.issueGrant(ALICE, FILE)
    fixture.clock.set(new Date(grant.expiresAt.getTime() - 1))
    const link = await fixture.store.issueDownloadLink(ALICE, grant.token)
    fixture.clock.set(new Date(grant.expiresAt.getTime() + MINUTE))
    await expect(fixture.store.redeemDownloadLink(link.token)).resolves.toMatchObject({
      app: 'mail',
    })
  })

  it('fails with unknown-transfer for a token never issued, and for a grant token', async () => {
    const grant = await fixture.store.issueGrant(ALICE, FILE)
    await expectTransferError(fixture.store.redeemDownloadLink('never-issued'), 'unknown-transfer')
    await expectTransferError(fixture.store.redeemDownloadLink(grant.token), 'unknown-transfer')
  })

  it('works one millisecond before expiry and is expired exactly at expiresAt', async () => {
    const grant = await fixture.store.issueGrant(ALICE, FILE)
    const link = await fixture.store.issueDownloadLink(ALICE, grant.token)

    fixture.clock.set(new Date(link.expiresAt.getTime() - 1))
    await expect(fixture.store.redeemDownloadLink(link.token)).resolves.toMatchObject({
      app: 'mail',
    })

    fixture.clock.set(link.expiresAt)
    const expired = await expectTransferError(
      fixture.store.redeemDownloadLink(link.token),
      'expired'
    )
    expect(expired.message).not.toContain(link.token)
  })
})
