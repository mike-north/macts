/**
 * The sweep: removal of expired transfers and the files behind them, on open
 * and opportunistically at most once a minute on mutating calls.
 *
 * Expected lifetimes come from the documented limits: grants and uploads 15
 * minutes, download links 5 minutes, temporary copies 60 minutes, and the
 * unreleased bytes of a consumed upload 15 minutes from consumption.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D8)
 */

import { describe, expect, it } from 'vitest'
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSqlite } from '../storage/sqlite.js'
import {
  ALICE,
  MINUTE,
  chunks,
  expectTransferError,
  useTransferStore,
} from './transfer-test-helpers.js'

const FILE = {
  app: 'finder',
  path: '/Users/alice/a.txt',
  observedAt: new Date('2026-01-15T09:00:00.000Z'),
}

/** Row counts per table, read straight from the database file. */
function rowCounts(home: string): Record<string, number> {
  const { DatabaseSync } = loadSqlite()
  const database = new DatabaseSync(join(home, 'transfers', 'transfers.db'), { readOnly: true })
  try {
    const counts: Record<string, number> = {}
    for (const table of ['grants', 'download_links', 'uploads', 'temporary_copies']) {
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

  function uploadFile(uploadId: string): string {
    return join(fixture.home, 'transfers', 'uploads', uploadId)
  }

  it('removes expired records and files and leaves live ones', async () => {
    const { store, clock } = fixture

    // Issued at 10:00 — all expired by 10:15 except the temporary copy (11:00).
    const oldGrant = await store.issueGrant(ALICE, FILE)
    const oldLink = await store.issueDownloadLink(ALICE, oldGrant.token)
    const unreceived = await store.createUpload(ALICE)
    const received = await store.createUpload(ALICE)
    await store.receiveUpload(ALICE, received.uploadId, chunks('expired bytes'))
    const released = await store.createUpload(ALICE)
    await store.receiveUpload(ALICE, released.uploadId, chunks('used'))
    await (await store.consumeUpload(ALICE, released.uploadId)).release()
    const oldCopy = (await store.allocateTemporaryCopy(ALICE)).path
    writeFileSync(oldCopy, 'x')

    // Issued at 10:10 — still live at 10:15.
    clock.set('2026-01-15T10:10:00.000Z')
    const liveGrant = await store.issueGrant(ALICE, FILE)
    const liveLink = await store.issueDownloadLink(ALICE, liveGrant.token)
    const live = await store.createUpload(ALICE)
    await store.receiveUpload(ALICE, live.uploadId, chunks('live bytes'))

    clock.set('2026-01-15T10:15:00.000Z')
    await store.sweep()

    // A swept transfer is unknown, not merely expired.
    await expectTransferError(store.redeemGrant(ALICE, oldGrant.token), 'unknown-transfer')
    await expectTransferError(store.redeemDownloadLink(oldLink.token), 'unknown-transfer')
    await expectTransferError(store.consumeUpload(ALICE, unreceived.uploadId), 'unknown-transfer')
    expect(existsSync(uploadFile(received.uploadId))).toBe(false)
    expect(rowCounts(fixture.home)).toEqual({
      grants: 1,
      download_links: 0, // the live link expired at 10:15 too (5-minute lifetime)
      uploads: 1,
      temporary_copies: 1,
    })
    expect(existsSync(oldCopy)).toBe(true)

    await expect(store.redeemGrant(ALICE, liveGrant.token)).resolves.toMatchObject({
      app: 'finder',
    })
    await expectTransferError(store.redeemDownloadLink(liveLink.token), 'unknown-transfer')
    expect(existsSync(uploadFile(live.uploadId))).toBe(true)

    clock.set('2026-01-15T11:00:00.000Z')
    await store.sweep()
    expect(existsSync(oldCopy)).toBe(false)
    expect(rowCounts(fixture.home)).toEqual({
      grants: 0,
      download_links: 0,
      uploads: 0,
      temporary_copies: 0,
    })
  })

  it('keeps the unreleased bytes of a consumed upload for 15 minutes after consumption', async () => {
    const { store, clock } = fixture
    const { uploadId } = await store.createUpload(ALICE)
    await store.receiveUpload(ALICE, uploadId, chunks('in use'))
    clock.set('2026-01-15T10:05:00.000Z')
    await store.consumeUpload(ALICE, uploadId)

    // The upload itself expired at 10:15, but an operation may still be reading.
    clock.set('2026-01-15T10:19:59.999Z')
    await store.sweep()
    expect(existsSync(uploadFile(uploadId))).toBe(true)

    clock.set('2026-01-15T10:20:00.000Z')
    await store.sweep()
    expect(existsSync(uploadFile(uploadId))).toBe(false)
    expect(rowCounts(fixture.home)['uploads']).toBe(0)
  })

  it('treats files that are already gone as removed', async () => {
    const { store, clock } = fixture
    const { uploadId } = await store.createUpload(ALICE)
    await store.receiveUpload(ALICE, uploadId, chunks('bytes'))
    rmSync((await store.allocateTemporaryCopy(ALICE)).path)
    rmSync(uploadFile(uploadId))

    clock.advance(60 * MINUTE)
    await expect(store.sweep()).resolves.toBeUndefined()
    expect(rowCounts(fixture.home)).toMatchObject({ uploads: 0, temporary_copies: 0 })
  })

  it.skipIf(process.getuid?.() === 0)(
    'keeps the record of a file it cannot delete, and removes it on a later sweep',
    async () => {
      const { store, clock } = fixture
      const { uploadId } = await store.createUpload(ALICE)
      await store.receiveUpload(ALICE, uploadId, chunks('bytes'))
      const uploads = join(fixture.home, 'transfers', 'uploads')

      clock.advance(15 * MINUTE)
      chmodSync(uploads, 0o500)
      try {
        await expect(store.sweep()).resolves.toBeUndefined()
        expect(rowCounts(fixture.home)['uploads']).toBe(1)
      } finally {
        chmodSync(uploads, 0o700)
      }

      await store.sweep()
      expect(existsSync(uploadFile(uploadId))).toBe(false)
      expect(rowCounts(fixture.home)['uploads']).toBe(0)
    }
  )

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
    await store.createUpload(ALICE)
    await expectTransferError(store.redeemGrant(ALICE, later.token), 'expired')

    // A full minute after the last sweep, the next mutating call sweeps again
    // once it finishes.
    clock.set('2026-01-15T10:16:30.000Z')
    await store.createUpload(ALICE)
    await expectTransferError(store.redeemGrant(ALICE, later.token), 'unknown-transfer')
  })
})

/**
 * Regression: the bytes path was built straight from the stored `upload_id`,
 * so a corrupted or tampered row such as `../victim` could aim the sweep (or
 * a consume's cleanup) outside `<home>/transfers/uploads`. Only ids in the
 * exact format the store mints now resolve to a path, and only to a direct
 * child of the canonical uploads directory.
 */
describe('upload records with ids the store never minted', () => {
  const fixture = useTransferStore()

  /** Insert an upload row straight into the database, bypassing the store. */
  function plantUpload(uploadId: string, columns: { released: number; consumedAt?: number }): void {
    const { DatabaseSync } = loadSqlite()
    const database = new DatabaseSync(join(fixture.home, 'transfers', 'transfers.db'))
    try {
      database
        .prepare(
          `INSERT INTO uploads (upload_id, subject, max_bytes, created_at, expires_at, state,
             received_bytes, consumed_at, released)
           VALUES (?, ?, 10, ?, ?, 'complete', 5, ?, ?)`
        )
        .run(
          uploadId,
          ALICE,
          Date.parse('2026-01-15T09:00:00.000Z'),
          Date.parse('2026-01-15T09:15:00.000Z'),
          columns.consumedAt ?? null,
          columns.released
        )
    } finally {
      database.close()
    }
  }

  it('never deletes through a planted ../ id, and drops the unusable records', async () => {
    const transfers = join(fixture.home, 'transfers')
    // Targets one and two levels above uploads/, and a sibling directory.
    writeFileSync(join(transfers, 'victim'), 'inside transfers')
    writeFileSync(join(fixture.home, 'victim'), 'inside home')
    mkdirSync(join(transfers, 'elsewhere'))
    writeFileSync(join(transfers, 'elsewhere', 'victim'), 'in a sibling')
    plantUpload('../victim', { released: 1 })
    plantUpload('../../victim', { released: 0 })
    plantUpload('../elsewhere/victim', {
      released: 0,
      consumedAt: Date.parse('2026-01-15T09:01:00.000Z'),
    })

    await fixture.store.sweep()

    expect(readFileSync(join(transfers, 'victim'), 'utf8')).toBe('inside transfers')
    expect(readFileSync(join(fixture.home, 'victim'), 'utf8')).toBe('inside home')
    expect(readFileSync(join(transfers, 'elsewhere', 'victim'), 'utf8')).toBe('in a sibling')
    expect(rowCounts(fixture.home)['uploads']).toBe(0)
  })

  it('treats a planted id as unknown to receive and consume, touching nothing', async () => {
    const transfers = join(fixture.home, 'transfers')
    writeFileSync(join(transfers, 'victim'), 'untouched')
    fixture.clock.set('2026-01-15T09:05:00.000Z')
    plantUpload('../victim', { released: 0 })

    await expectTransferError(
      fixture.store.receiveUpload(ALICE, '../victim', chunks('overwrite')),
      'unknown-transfer'
    )
    await expectTransferError(fixture.store.consumeUpload(ALICE, '../victim'), 'unknown-transfer')

    expect(readFileSync(join(transfers, 'victim'), 'utf8')).toBe('untouched')
  })
})
