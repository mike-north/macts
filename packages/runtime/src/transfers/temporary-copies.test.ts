/**
 * Temporary copies: files materialized for a local read. The store mints
 * every copy's path itself, the caller writes and releases the copy, and the
 * sweep removes abandoned ones. The store deletes only regular files it
 * named, directly inside its canonical copies directory.
 *
 * Expected values come from phases/13 D8 ("TemporaryFileCopy", "Limits and
 * lifecycle") and the documented limits: a temporary copy is kept at most 60
 * minutes.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D8)
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { loadSqlite } from '../storage/sqlite.js'
import { ALICE, MINUTE, rejectionOf, useTransferStore } from './transfer-test-helpers.js'

const UUID_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** The copies directory as the filesystem resolves it (on macOS, under /private). */
function canonicalCopies(home: string): string {
  return realpathSync(join(home, 'transfers', 'copies'))
}

/** Record a temporary copy straight in the database, bypassing the store's API. */
function recordCopyDirectly(home: string, copyPath: string, expiresAt: Date): void {
  const { DatabaseSync } = loadSqlite()
  const database = new DatabaseSync(join(home, 'transfers', 'transfers.db'))
  try {
    database
      .prepare('INSERT INTO temporary_copies (path, subject, expires_at) VALUES (?, ?, ?)')
      .run(copyPath, ALICE, expiresAt.getTime())
  } finally {
    database.close()
  }
}

describe('allocateTemporaryCopy', () => {
  const fixture = useTransferStore()

  it('mints an empty owner-only file with a random name in the canonical copies directory', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)

    expect(dirname(copy.path)).toBe(canonicalCopies(fixture.home))
    expect(basename(copy.path)).toMatch(UUID_NAME)
    expect(statSync(copy.path).isFile()).toBe(true)
    expect(statSync(copy.path).size).toBe(0)
    expect(statSync(copy.path).mode & 0o777).toBe(0o600)
  })

  it('returns a canonical path, equal to its own realpath', async () => {
    // tmpdir() is under /var on macOS, which is a symlink to /private/var.
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    expect(realpathSync(copy.path)).toBe(copy.path)
  })

  it('expires 60 minutes from now', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    expect(copy.expiresAt).toEqual(new Date('2026-01-15T11:00:00.000Z'))
  })

  it('mints a different path every time', async () => {
    const first = await fixture.store.allocateTemporaryCopy(ALICE)
    const second = await fixture.store.allocateTemporaryCopy(ALICE)
    expect(first.path).not.toBe(second.path)
  })

  it('appends a valid extension', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE, { extension: '.pdf' })
    expect(basename(copy.path)).toMatch(/^[0-9a-f-]{36}\.pdf$/)
    expect(dirname(copy.path)).toBe(canonicalCopies(fixture.home))
  })

  it.each([
    'pdf',
    '.',
    '..',
    '../escape',
    '.a/b',
    '.a\\b',
    '.p d',
    '.pdf\0',
    '.é',
    '.abcdefghijklmnopq', // 17 characters after the dot
  ])('rejects the extension %j without creating a file', async (extension) => {
    await expect(fixture.store.allocateTemporaryCopy(ALICE, { extension })).rejects.toThrow(
      RangeError
    )
    expect(readdirSync(canonicalCopies(fixture.home))).toEqual([])
  })

  it('takes no caller-chosen path, and exposes no copies directory', () => {
    expect('registerTemporaryCopy' in fixture.store).toBe(false)
    expect('temporaryCopyDirectory' in fixture.store).toBe(false)
  })
})

describe('temporary copy release', () => {
  const fixture = useTransferStore()

  it('deletes the copy and is idempotent', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    writeFileSync(copy.path, 'copied bytes')

    await Promise.all([copy.release(), copy.release()])
    expect(existsSync(copy.path)).toBe(false)
    await expect(copy.release()).resolves.toBeUndefined()
  })

  it('succeeds when the copy is already gone', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    unlinkSync(copy.path)
    await expect(copy.release()).resolves.toBeUndefined()
  })

  it.skipIf(process.getuid?.() === 0)(
    'reports a failed delete without naming the copy, and can be retried',
    async () => {
      const copy = await fixture.store.allocateTemporaryCopy(ALICE)
      const copies = canonicalCopies(fixture.home)
      chmodSync(copies, 0o500)
      let error: unknown
      try {
        error = await rejectionOf(copy.release())
      } finally {
        chmodSync(copies, 0o700)
      }

      expect(error).toBeInstanceOf(Error)
      if (!(error instanceof Error)) return
      expect(error.message).toBe('The transfer store could not delete the temporary copy.')
      expect(error.message).not.toContain(basename(copy.path))
      expect(error.cause).toBeInstanceOf(Error)

      await expect(copy.release()).resolves.toBeUndefined()
      expect(existsSync(copy.path)).toBe(false)
    }
  )
})

/**
 * Regression: confinement used to be lexical. A caller-supplied path through
 * a symlinked subdirectory of `copies/` (`copies/evil -> /outside`,
 * registering `copies/evil/precious`) let the sweep delete
 * `/outside/precious`. The store now mints every path and deletes only
 * regular files directly inside the canonical copies directory.
 */
describe('temporary copy confinement', () => {
  const fixture = useTransferStore()
  let outside = ''
  let precious = ''

  beforeEach(() => {
    outside = mkdtempSync(join(tmpdir(), 'macts-outside-store-'))
    precious = join(outside, 'precious')
    writeFileSync(precious, 'must survive')
  })

  afterEach(() => {
    rmSync(outside, { recursive: true, force: true })
  })

  it('never deletes through a symlinked subdirectory of the copies directory', async () => {
    const lexicalCopies = join(fixture.home, 'transfers', 'copies')
    symlinkSync(outside, join(lexicalCopies, 'evil'))
    // The paths the old, caller-path API accepted, in lexical and canonical
    // form, as they would be on record.
    const expiry = new Date('2026-01-15T11:00:00.000Z')
    recordCopyDirectly(fixture.home, join(lexicalCopies, 'evil', 'precious'), expiry)
    recordCopyDirectly(
      fixture.home,
      join(canonicalCopies(fixture.home), 'evil', 'precious'),
      expiry
    )

    fixture.clock.advance(61 * MINUTE)
    await fixture.store.sweep()

    expect(readFileSync(precious, 'utf8')).toBe('must survive')
    expect(lstatSync(join(lexicalCopies, 'evil')).isSymbolicLink()).toBe(true)
  })

  it('neither follows nor removes a symlink that replaced a minted copy, on release', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    unlinkSync(copy.path)
    symlinkSync(precious, copy.path)

    await expect(copy.release()).resolves.toBeUndefined()

    expect(readFileSync(precious, 'utf8')).toBe('must survive')
    expect(lstatSync(copy.path).isSymbolicLink()).toBe(true)
  })

  it('neither follows nor removes a symlink that replaced a minted copy, on sweep', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    unlinkSync(copy.path)
    symlinkSync(outside, copy.path)

    fixture.clock.advance(61 * MINUTE)
    await fixture.store.sweep()

    expect(readFileSync(precious, 'utf8')).toBe('must survive')
    expect(lstatSync(copy.path).isSymbolicLink()).toBe(true)
  })

  it('leaves a directory that replaced a minted copy in place', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    unlinkSync(copy.path)
    mkdirSync(copy.path)
    writeFileSync(join(copy.path, 'inner'), 'kept')

    fixture.clock.advance(61 * MINUTE)
    await fixture.store.sweep()

    expect(readFileSync(join(copy.path, 'inner'), 'utf8')).toBe('kept')
  })
})
