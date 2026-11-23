/**
 * The sweep: removal of expired grants and download links, on open and
 * opportunistically at most once a minute on mutating calls.
 *
 * Expected lifetimes come from the documented limits: grants 15 minutes and
 * download links 5 minutes. A transfer is expired from its `expiresAt`
 * onwards, so a sweep at that instant removes it.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D8)
 */

import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { loadSqlite } from '../storage/sqlite.js'
import { ALICE, expectTransferError, useTransferStore } from './transfer-test-helpers.js'

const FILE = {
  app: 'finder',
  path: '/Users/alice/a.txt',
  observedAt: new Date('2026-01-15T09:00:00.000Z'),
}

/** Row counts of the grant and link tables, read straight from the database file. */
function rowCounts(home: string): Record<string, number> {
  const { DatabaseSync } = loadSqlite()
  const database = new DatabaseSync(join(home, 'transfers', 'transfers.db'), { readOnly: true })
  try {
    const counts: Record<string, number> = {}
    for (const table of ['grants', 'download_links']) {
      const row = database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()
      counts[table] = Number(row?.['n'])
    }
    return counts
  } finally {
    database.close()
  }
}

describe('sweep', () => {
  const fixture = useTransferStore()

  it('removes expired records and leaves live ones', async () => {
    const { store, clock } = fixture

    // Issued at 10:00: the grant expires at 10:15, its link at 10:05.
    const oldGrant = await store.issueGrant(ALICE, FILE)
    const oldLink = await store.issueDownloadLink(ALICE, oldGrant.token)

    // Issued at 10:12: the grant expires at 10:27, its link at 10:17.
    clock.set('2026-01-15T10:12:00.000Z')
    const liveGrant = await store.issueGrant(ALICE, FILE)
    const liveLink = await store.issueDownloadLink(ALICE, liveGrant.token)

    clock.set('2026-01-15T10:15:00.000Z')
    await store.sweep()

    // A swept transfer is unknown, not merely expired.
    await expectTransferError(store.redeemGrant(ALICE, oldGrant.token), 'unknown-transfer')
    await expectTransferError(store.redeemDownloadLink(oldLink.token), 'unknown-transfer')
    expect(rowCounts(fixture.home)).toEqual({ grants: 1, download_links: 1 })
    await expect(store.redeemGrant(ALICE, liveGrant.token)).resolves.toMatchObject({
      app: 'finder',
    })
    await expect(store.redeemDownloadLink(liveLink.token)).resolves.toMatchObject({
      app: 'finder',
    })

    clock.set('2026-01-15T10:17:00.000Z')
    await store.sweep()
    expect(rowCounts(fixture.home)).toEqual({ grants: 1, download_links: 0 })

    clock.set('2026-01-15T10:27:00.000Z')
    await store.sweep()
    expect(rowCounts(fixture.home)).toEqual({ grants: 0, download_links: 0 })
  })

  it('runs when a store is opened', async () => {
    const grant = await fixture.store.issueGrant(ALICE, FILE)
    fixture.store.close()
    fixture.clock.set(grant.expiresAt)

    const reopened = await fixture.open()

    await expectTransferError(reopened.redeemGrant(ALICE, grant.token), 'unknown-transfer')
  })

  it('runs after a mutating call, at most once a minute', async () => {
    const { store, clock } = fixture
    // The store was swept when opened, at 10:00:00.
    const early = await store.issueGrant(ALICE, FILE) // expires 10:15:00
    clock.set('2026-01-15T10:00:45.000Z')
    const later = await store.issueGrant(ALICE, FILE) // expires 10:15:45

    // Lookups never sweep: the expired grant is still on record.
    clock.set('2026-01-15T10:15:30.000Z')
    await expectTransferError(store.redeemGrant(ALICE, early.token), 'expired')

    // A mutating call over a minute after the last sweep reports on the
    // records it found (the grant is expired, not unknown), then sweeps.
    await expectTransferError(store.issueDownloadLink(ALICE, early.token), 'expired')
    await expectTransferError(store.redeemGrant(ALICE, early.token), 'unknown-transfer')

    // Thirty seconds later, no sweep yet: the second grant is expired but kept.
    clock.set('2026-01-15T10:16:00.000Z')
    await store.issueGrant(ALICE, FILE)
    await expectTransferError(store.redeemGrant(ALICE, later.token), 'expired')

    // A full minute after the last sweep, the next mutating call sweeps again
    // once it finishes.
    clock.set('2026-01-15T10:16:30.000Z')
    await store.issueGrant(ALICE, FILE)
    await expectTransferError(store.redeemGrant(ALICE, later.token), 'unknown-transfer')
  })
})
