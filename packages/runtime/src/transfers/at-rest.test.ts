/**
 * What the transfer store leaves on disk: owner-only directories and files,
 * no raw tokens, and records that survive reopening.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D8)
 * @see https://www.sqlite.org/wal.html
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { hashToken } from './tokens.js'
import { ALICE, chunks, useTransferStore } from './transfer-test-helpers.js'

const FILE = {
  app: 'finder',
  path: '/Users/alice/a.txt',
  observedAt: new Date('2026-01-15T09:00:00.000Z'),
}

/** Permission bits of a path. */
function modeOf(target: string): number {
  return statSync(target).mode & 0o777
}

describe('files on disk', () => {
  const fixture = useTransferStore()

  it('creates directories 0700 and the database and upload files 0600', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    await fixture.store.receiveUpload(ALICE, uploadId, chunks('secret bytes'))
    const root = join(fixture.home, 'transfers')

    expect(modeOf(root)).toBe(0o700)
    expect(modeOf(join(root, 'uploads'))).toBe(0o700)
    expect(modeOf(join(root, 'copies'))).toBe(0o700)
    expect(modeOf(join(root, 'transfers.db'))).toBe(0o600)
    expect(modeOf(join(root, 'uploads', uploadId))).toBe(0o600)
    for (const companion of readdirSync(root).filter((name) => name.startsWith('transfers.db-'))) {
      expect(modeOf(join(root, companion))).toBe(0o600)
    }
  })

  it('never stores a raw grant or download link token', async () => {
    const tokens: string[] = []
    for (let i = 0; i < 5; i++) {
      const grant = await fixture.store.issueGrant(ALICE, FILE)
      const link = await fixture.store.issueDownloadLink(ALICE, grant.token)
      tokens.push(grant.token, link.token)
    }
    const root = join(fixture.home, 'transfers')
    const databaseFiles = (): string[] =>
      readdirSync(root).filter((name) => name.startsWith('transfers.db'))

    // Inspect the database and its write-ahead log both while open and after
    // close (which checkpoints the log into the database file).
    for (const phase of ['open', 'closed'] as const) {
      if (phase === 'closed') {
        fixture.store.close()
      }
      const bytes = Buffer.concat(databaseFiles().map((name) => readFileSync(join(root, name))))
      for (const token of tokens) {
        expect(bytes.includes(token), `raw token found (${phase})`).toBe(false)
        // Only the digest is kept, so the store can still find the token.
        if (phase === 'closed') {
          expect(bytes.includes(hashToken(token))).toBe(true)
        }
      }
    }
  })
})

describe('persistence', () => {
  const fixture = useTransferStore()

  it('honors grants, links, and uploads from a store opened on the same home', async () => {
    const first = fixture.store
    const grant = await first.issueGrant(ALICE, FILE)
    const link = await first.issueDownloadLink(ALICE, grant.token)
    const { uploadId } = await first.createUpload(ALICE, { contentType: 'text/plain' })
    await first.receiveUpload(ALICE, uploadId, chunks('persisted'))
    first.close()

    const second = await fixture.open()

    await expect(second.redeemGrant(ALICE, grant.token)).resolves.toEqual({
      ...FILE,
      expiresAt: new Date('2026-01-15T10:15:00.000Z'),
    })
    await expect(second.redeemDownloadLink(link.token)).resolves.toEqual({
      app: FILE.app,
      path: FILE.path,
    })
    const consumed = await second.consumeUpload(ALICE, uploadId)
    expect(consumed.contentType).toBe('text/plain')
    expect(readFileSync(consumed.path, 'utf8')).toBe('persisted')
  })

  it('shares single use across stores open on the same home at once', async () => {
    const other = await fixture.open()
    const { uploadId } = await fixture.store.createUpload(ALICE)
    await fixture.store.receiveUpload(ALICE, uploadId, chunks('once'))

    await other.consumeUpload(ALICE, uploadId)
    await expect(fixture.store.consumeUpload(ALICE, uploadId)).rejects.toMatchObject({
      details: { reason: 'unknown-transfer' },
    })
  })
})

describe('close', () => {
  const fixture = useTransferStore()

  it('is idempotent and makes later calls fail', async () => {
    fixture.store.close()
    fixture.store.close()
    await expect(fixture.store.issueGrant(ALICE, FILE)).rejects.toThrow('closed')
  })
})
